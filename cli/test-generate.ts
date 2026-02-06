import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { config } from "dotenv";
import OpenAI from "openai";

config({ path: path.resolve(__dirname, "../.env") });

function createOpenAIClient(apiKey: string): OpenAI {
  return new OpenAI({ apiKey, timeout: 300_000, maxRetries: 3 });
}

async function withRetry<T>(
  fn: () => Promise<T>,
  { retries = 3, baseDelay = 2000, label = "API call" } = {},
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const isNetwork =
        err instanceof OpenAI.APIConnectionError ||
        err?.cause?.toString?.()?.includes("fetch failed") ||
        err?.code === "ECONNRESET" ||
        err?.code === "ENOTFOUND";

      if (!isNetwork || attempt === retries) throw err;

      const delay = baseDelay * 2 ** (attempt - 1);
      console.log(c.yellow(`\n  ⚠ ${label}: network error (attempt ${attempt}/${retries}), retrying in ${delay / 1000}s...`));
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("unreachable");
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MeditationType =
  | "guided"
  | "vipassana"
  | "sleep"
  | "relaxation"
  | "self_compassion"
  | "breathing";

interface SpeechSegment {
  type: "speech";
  text: string;
}

interface SilenceSegment {
  type: "silence";
  seconds: number;
}

interface DongSegment {
  type: "dong";
}

type Segment = SpeechSegment | SilenceSegment | DongSegment;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_TYPES: MeditationType[] = [
  "guided", "vipassana", "sleep", "relaxation", "self_compassion", "breathing",
];

const VALID_VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];

const SYSTEM_PROMPT = `You are an expert meditation guide. Generate a meditation script.

DONG RULES (STRICT - NO EXCEPTIONS):
- Use EXACTLY 6 [DONG] markers total:
  • 3 [DONG] at the very beginning (on separate lines)
  • 3 [DONG] at the very end (on separate lines)
- NO [DONG] anywhere else in the meditation
- After the 3 opening DONGs, guide 3-4 deep breaths WITH YOUR VOICE

STRUCTURE (MANDATORY):
[DONG]
[DONG]
[DONG]
[Voice guides breathing: "Take a deep breath in... and slowly exhale..."]
[SILENT 5s]
[Voice: "Another deep breath... filling your lungs... and release..."]
[SILENT 5s]
[Voice: "One more breath... inhale deeply... and let go..."]
[SILENT 10s]
... main meditation content with silences ...
[Voice: closing words...]
[DONG]
[DONG]
[DONG]

DURATION RULES (CRITICAL - USE REASONING TO CALCULATE):
1. Calculate the exact word count needed: (target_minutes - silence_minutes - 0.25) * 130
2. Calculate total silence needed: at least 30% of target duration
3. For 10 min: ~850 words speech + ~180s total silence + 15s DONGs
4. For 5 min: ~400 words speech + ~90s total silence + 15s DONGs
5. For 15 min: ~1200 words speech + ~270s total silence + 15s DONGs
6. VERIFY your word count matches the calculation before outputting

SILENCE DISTRIBUTION:
- Short (5-10s): between phrases, after questions
- Medium (15-30s): breathing exercises, body awareness
- Long (30-60s): deep observation, body scan sections
- A 10-minute meditation needs AT LEAST 150s of total silence

FORMATTING:
- Write ONLY the meditation script, no meta-commentary
- [SILENT Xs] markers on their own line
- [DONG] markers on their own line
- Respond in the same language as the user's prompt`;

const DONG_DURATION_S = 2.5;
const WORDS_PER_MINUTE = 130;

// ---------------------------------------------------------------------------
// CLI arg parsing
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  let prompt = "";
  let type: MeditationType = "guided";
  let duration = 10;
  let voice = "nova";
  let speed = 0.85;
  let audio = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--prompt":
      case "-p":
        prompt = args[++i] ?? "";
        break;
      case "--type":
      case "-t":
        type = (VALID_TYPES.includes(args[i + 1] as MeditationType)
          ? args[++i]
          : "guided") as MeditationType;
        break;
      case "--duration":
      case "-d":
        duration = parseInt(args[++i], 10) || 10;
        break;
      case "--voice":
      case "-v":
        voice = VALID_VOICES.includes(args[i + 1]) ? args[++i] : "nova";
        break;
      case "--speed":
      case "-s":
        speed = Math.min(4.0, Math.max(0.25, parseFloat(args[++i]) || 0.85));
        break;
      case "--audio":
      case "-a":
        audio = true;
        break;
      case "--help":
      case "-h":
        printUsage();
        process.exit(0);
        break;
      default:
        if (!args[i].startsWith("-") && !prompt) {
          prompt = args[i];
        }
        break;
    }
  }

  return { prompt, type, duration, voice, speed, audio };
}

function printUsage() {
  console.log(`
Usage: npx tsx cli/test-generate.ts --prompt "your meditation prompt" [options]

Options:
  -p, --prompt <text>     Meditation prompt (required)
  -t, --type <type>       Type: guided|vipassana|sleep|relaxation|self_compassion|breathing [guided]
  -d, --duration <min>    Duration in minutes [10]
  -v, --voice <voice>     TTS voice: alloy|echo|fable|onyx|nova|shimmer [nova]
  -s, --speed <speed>     TTS speed: 0.25-4.0 [0.85]
  -a, --audio             Generate audio files (default: text only)
  -h, --help              Show this help

Examples:
  npx tsx cli/test-generate.ts --prompt "Meditazione sul respiro" --duration 5
  npx tsx cli/test-generate.ts -p "Sleep meditation" -t sleep -d 15 -a
  npx tsx cli/test-generate.ts -p "Body scan rilassante" -d 10 -v shimmer --audio
`);
}

// ---------------------------------------------------------------------------
// ANSI colors
// ---------------------------------------------------------------------------

const c = {
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
};

// ---------------------------------------------------------------------------
// Segment parser
// ---------------------------------------------------------------------------

function parseSegments(text: string): Segment[] {
  const regex = /\[SILENT\s+(\d+)\s*s?\]|\[DONG\]/gi;
  const segments: Segment[] = [];
  let lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index).trim();
    if (before.length > 0) {
      segments.push({ type: "speech", text: before });
    }

    if (match[0].toUpperCase().startsWith("[SILENT")) {
      segments.push({ type: "silence", seconds: parseInt(match[1], 10) });
    } else {
      segments.push({ type: "dong" });
    }

    lastIndex = match.index + match[0].length;
  }

  const trailing = text.slice(lastIndex).trim();
  if (trailing.length > 0) {
    segments.push({ type: "speech", text: trailing });
  }

  return segments;
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

function printColoredText(text: string): void {
  const regex = /(\[SILENT\s+\d+\s*s?\]|\[DONG\])/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    process.stdout.write(text.slice(lastIndex, match.index));
    const marker = match[0];
    if (marker.toUpperCase().startsWith("[SILENT")) {
      process.stdout.write(c.yellow(marker));
    } else {
      process.stdout.write(c.cyan(marker));
    }
    lastIndex = match.index + match[0].length;
  }
  process.stdout.write(text.slice(lastIndex));
  console.log();
}

function printStats(segments: Segment[], speed: number): void {
  let wordCount = 0;
  let speechCount = 0;
  let silenceCount = 0;
  let dongCount = 0;
  let totalSilenceS = 0;

  for (const seg of segments) {
    if (seg.type === "speech") {
      wordCount += seg.text.split(/\s+/).filter(Boolean).length;
      speechCount++;
    } else if (seg.type === "silence") {
      totalSilenceS += seg.seconds;
      silenceCount++;
    } else {
      dongCount++;
    }
  }

  const effectiveWPM = WORDS_PER_MINUTE * (speed / 0.9);
  const spokenMin = wordCount / effectiveWPM;
  const silenceMin = totalSilenceS / 60;
  const dongMin = (dongCount * DONG_DURATION_S) / 60;
  const totalMin = spokenMin + silenceMin + dongMin;

  console.log(`\n${c.bold("--- Statistics ---")}`);
  console.log(`  Words:        ${wordCount}`);
  console.log(`  Segments:     ${segments.length} (${speechCount} speech, ${silenceCount} silence, ${dongCount} dong)`);
  console.log(`  Speech:       ${spokenMin.toFixed(1)} min`);
  console.log(`  Silence:      ${totalSilenceS}s (${silenceMin.toFixed(1)} min)`);
  console.log(`  Dong:         ${dongCount}x (${dongMin.toFixed(1)} min)`);
  console.log(c.green(`  Total:        ${totalMin.toFixed(1)} min`));
}

// ---------------------------------------------------------------------------
// OpenAI
// ---------------------------------------------------------------------------

async function generateText(
  client: OpenAI,
  prompt: string,
  type: MeditationType,
  durationMinutes: number,
): Promise<string> {
  const userPrompt = `Meditation type: ${type}\nTarget duration: ${durationMinutes} minutes\n\n${prompt}`;

  const stream = await withRetry(
    () => client.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      reasoning_effort: "medium",
      max_completion_tokens: 16384,
      stream: true,
    }),
    { label: "Text generation" },
  );

  let fullContent = "";
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      fullContent += delta;
      process.stdout.write(c.dim("."));
    }
  }

  console.log();
  return fullContent;
}

async function generateTTS(client: OpenAI, text: string, voice: string, speed: number): Promise<Buffer> {
  const response = await withRetry(
    () => client.audio.speech.create({
      model: "gpt-4o-mini-tts",
      input: text,
      voice: voice as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer",
      instructions: "Speak very slowly and calmly, like a meditation guide. Use a soothing, peaceful tone with natural pauses between phrases. Breathe naturally between sentences.",
      response_format: "mp3",
      speed,
    }),
    { label: "TTS" },
  );

  return Buffer.from(await response.arrayBuffer());
}

function generateSilenceMp3(seconds: number, outputPath: string): void {
  execSync(
    `ffmpeg -f lavfi -i anullsrc=sample_rate=48000:channel_layout=stereo -t ${seconds} -q:a 9 -acodec libmp3lame "${outputPath}" -y`,
    { stdio: "ignore" }
  );
}

function concatenateSegments(segmentFiles: string[], outputDir: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "").slice(0, 15);
  const finalFile = path.join(outputDir, `meditation_${timestamp}.mp3`);
  const concatList = path.join(outputDir, "concat.txt");

  // Create concat list for ffmpeg
  const listContent = segmentFiles.map(f => `file '${f}'`).join("\n");
  fs.writeFileSync(concatList, listContent);

  // Concatenate all segments
  execSync(`ffmpeg -f concat -safe 0 -i "${concatList}" -c:a libmp3lame -q:a 2 "${finalFile}" -y`, { stdio: "ignore" });

  // Cleanup temp files
  for (const f of segmentFiles) {
    fs.unlinkSync(f);
  }
  fs.unlinkSync(concatList);

  return finalFile;
}

// ---------------------------------------------------------------------------
// Audio file generation
// ---------------------------------------------------------------------------

async function generateAudioFiles(
  client: OpenAI,
  segments: Segment[],
  voice: string,
  speed: number,
): Promise<string> {
  const outputDir = path.resolve(__dirname, "output");
  fs.mkdirSync(outputDir, { recursive: true });

  const dongSource = path.resolve(__dirname, "../assets/sounds/dong.mp3");
  const hasDong = fs.existsSync(dongSource);
  if (!hasDong) {
    console.log(c.red(`  Warning: dong.mp3 not found at ${dongSource}`));
  }

  const segmentFiles: string[] = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const idx = String(i).padStart(3, "0");

    if (seg.type === "speech") {
      const name = `seg_${idx}_speech.mp3`;
      const dest = path.join(outputDir, name);
      const words = seg.text.split(/\s+/).length;
      console.log(c.dim(`  [${i + 1}/${segments.length}] TTS speech (${words} words)...`));
      const buf = await generateTTS(client, seg.text, voice, speed);
      fs.writeFileSync(dest, buf);
      segmentFiles.push(dest);
    } else if (seg.type === "silence") {
      const name = `seg_${idx}_silence.mp3`;
      const dest = path.join(outputDir, name);
      console.log(c.dim(`  [${i + 1}/${segments.length}] Generating ${seg.seconds}s silence...`));
      generateSilenceMp3(seg.seconds, dest);
      segmentFiles.push(dest);
    } else if (seg.type === "dong") {
      const name = `seg_${idx}_dong.mp3`;
      const dest = path.join(outputDir, name);
      if (hasDong) {
        console.log(c.dim(`  [${i + 1}/${segments.length}] Adding dong...`));
        fs.copyFileSync(dongSource, dest);
        segmentFiles.push(dest);
      }
    }
  }

  // Concatenate all segments into single file
  console.log(c.dim(`\n  Concatenating ${segmentFiles.length} segments...`));
  const finalFile = concatenateSegments(segmentFiles, outputDir);

  return finalFile;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const { prompt, type, duration, voice, speed, audio } = parseArgs();

  if (!prompt) {
    printUsage();
    console.error(c.red("Error: --prompt is required."));
    process.exit(1);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error(c.red("Error: OPENAI_API_KEY not found. Set it in .env or as env variable."));
    process.exit(1);
  }

  console.log(c.bold("\n=== ZenAI Meditation Generator ===\n"));
  console.log(`  Prompt:   "${prompt}"`);
  console.log(`  Type:     ${type}`);
  console.log(`  Duration: ${duration} min`);
  console.log(`  Voice:    ${voice}`);
  console.log(`  Speed:    ${speed}`);
  console.log(`  Audio:    ${audio ? "yes" : "no (text only)"}`);
  const client = createOpenAIClient(apiKey);

  console.log(c.dim("\nGenerating text with GPT-5.2 (streaming + reasoning)...\n"));

  const text = await generateText(client, prompt, type, duration);

  console.log(c.bold("--- Meditation Script ---\n"));
  printColoredText(text);

  const segments = parseSegments(text);
  printStats(segments, speed);

  if (audio) {
    console.log(c.dim("\nGenerating audio files...\n"));
    const finalFile = await generateAudioFiles(client, segments, voice, speed);
    console.log(c.bold("\n--- Generated File ---"));
    console.log(`  ${path.relative(process.cwd(), finalFile)}`);
    console.log(c.green(`\nDone! Single meditation file created.`));
  }
}

main().catch((err) => {
  if (err instanceof OpenAI.APIConnectionError || err?.cause?.toString?.()?.includes("fetch failed")) {
    console.error(c.red("\nNetwork error: cannot reach OpenAI API after multiple retries."));
    console.error(c.dim("  Check your internet connection and try again."));
  } else {
    console.error(c.red(`\nFatal error: ${err.message}`));
    if (err.cause) console.error(c.dim(`  Cause: ${err.cause}`));
  }
  process.exit(1);
});
