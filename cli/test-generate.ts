import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { config } from "dotenv";
import OpenAI from "openai";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { MEDITATION_SYSTEM_PROMPT, WORDS_PER_MINUTE, TTS_VOICE_INSTRUCTIONS, TEXT_GENERATION_MODEL, TEXT_GENERATION_REASONING, TEXT_GENERATION_MAX_OUTPUT_TOKENS, buildUserPrompt } from "../src/shared/prompts/meditation-system-prompt";
import { stripMarkersWithPositions, MarkerPosition } from "../src/infrastructure/audio-assembler/MarkerStripper";

config({ path: path.resolve(__dirname, "../.env") });

function createOpenAIClient(apiKey: string): OpenAI {
  return new OpenAI({ apiKey, timeout: 600_000, maxRetries: 3 });
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
      console.log(c.yellow(`\n  Warning: ${label}: network error (attempt ${attempt}/${retries}), retrying in ${delay / 1000}s...`));
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

type TTSProvider = "openai" | "elevenlabs";

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

interface TimestampAlignment {
  characters: string[];
  characterStartTimesSeconds: number[];
  characterEndTimesSeconds: number[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_TYPES: MeditationType[] = [
  "guided", "vipassana", "sleep", "relaxation", "self_compassion", "breathing",
];

const VALID_OPENAI_VOICES = [
  "coral", "marin", "cedar", "sage", "ballad", "ash", "verse",
  "alloy", "echo", "fable", "nova", "onyx", "shimmer",
];

const VALID_ELEVENLABS_VOICES: { id: string; label: string }[] = [
  { id: "SAz9YHcvj6GT2YYXdXww", label: "river" },
  { id: "Tfv2PGiTliSQ4XSXrJmA", label: "katherine" },
  { id: "KoVIHoyLDrQyd4pGalbs", label: "autumn-veil" },
  { id: "JBFqnCBsd6RMkjVDRZzb", label: "george" },
  { id: "nPczCjzI2devNBz1zQrb", label: "brian" },
  { id: "pqHfZKP75CvOlQylNhV4", label: "bill" },
  { id: "pFZP5JQG7iQjIQuC4Bku", label: "lily" },
  { id: "oVJbgLwL0s5pk9e2U6QH", label: "manuela" },
];

const DONG_DURATION_S = 2.5;
const MAX_CHUNK_LENGTH = 5000;
const ELEVENLABS_VOICE_SETTINGS = {
  stability: 0.65,
  similarityBoost: 0.9,
  style: 0.4,
  useSpeakerBoost: true,
  speed: 0.7,
};

// ---------------------------------------------------------------------------
// CLI arg parsing
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  let prompt = "";
  let type: MeditationType = "guided";
  let duration = 10;
  let voice = "coral";
  let speed = 1;
  let audio = false;
  let language = "";
  let ttsProvider: TTSProvider = "openai";
  let noMerge = false;

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
        voice = args[++i] ?? "coral";
        break;
      case "--speed":
      case "-s":
        speed = Math.min(4.0, Math.max(0.25, parseFloat(args[++i]) || 0.85));
        break;
      case "--language":
      case "-l":
        language = args[++i] ?? "";
        break;
      case "--audio":
      case "-a":
        audio = true;
        break;
      case "--tts-provider":
        ttsProvider = (args[++i] === "elevenlabs" ? "elevenlabs" : "openai") as TTSProvider;
        break;
      case "--no-merge":
        noMerge = true;
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

  // Validate voice against the selected provider
  if (ttsProvider === "elevenlabs") {
    const elLabels = VALID_ELEVENLABS_VOICES.map((v) => v.label);
    if (!elLabels.includes(voice.toLowerCase())) {
      voice = "autumn-veil";
    }
  } else {
    if (!VALID_OPENAI_VOICES.includes(voice)) {
      voice = "coral";
    }
  }

  return { prompt, type, duration, voice, speed, audio, language, ttsProvider, noMerge };
}

function printUsage() {
  const elVoiceNames = VALID_ELEVENLABS_VOICES.map((v) => v.label).join("|");
  console.log(`
Usage: npx tsx cli/test-generate.ts --prompt "your meditation prompt" [options]

Options:
  -p, --prompt <text>           Meditation prompt (required)
  -t, --type <type>             Type: guided|vipassana|sleep|relaxation|self_compassion|breathing [guided]
  -d, --duration <min>          Duration in minutes [10]
  -v, --voice <voice>           TTS voice (see below) [coral]
  -s, --speed <speed>           TTS speed: 0.25-4.0 [0.85]
  -l, --language <lang>         TTS language: en, it, fr, etc. [auto-detect]
  -a, --audio                   Generate audio files (default: text only)
  --tts-provider <provider>     TTS provider: openai|elevenlabs [openai]
  --no-merge                    Use legacy per-segment ElevenLabs approach (for A/B comparison)
  -h, --help                    Show this help

OpenAI voices: ${VALID_OPENAI_VOICES.join(", ")}
ElevenLabs voices: ${elVoiceNames}

Examples:
  npx tsx cli/test-generate.ts --prompt "Meditazione sul respiro" --duration 5
  npx tsx cli/test-generate.ts -p "Sleep meditation" -t sleep -d 15 -a
  npx tsx cli/test-generate.ts -p "Body scan rilassante" -d 10 -v shimmer --audio
  npx tsx cli/test-generate.ts -p "Breathing meditation" -a --tts-provider elevenlabs -v autumn-veil
  npx tsx cli/test-generate.ts -p "Meditazione" -d 5 -a --tts-provider elevenlabs -v autumn-veil --no-merge
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
  language: string,
): Promise<string> {
  const userPrompt = buildUserPrompt({
    prompt,
    type,
    durationMinutes,
    language: language || undefined,
  });

  const stream = await withRetry(
    () => client.responses.create({
      model: TEXT_GENERATION_MODEL,
      instructions: MEDITATION_SYSTEM_PROMPT,
      input: [{ role: "user", content: userPrompt }],
      reasoning: TEXT_GENERATION_REASONING,
      max_output_tokens: TEXT_GENERATION_MAX_OUTPUT_TOKENS,
      stream: true,
    }),
    { label: "Text generation" },
  );

  let fullContent = "";
  for await (const event of stream) {
    if (event.type === "response.output_text.delta") {
      fullContent += event.delta;
      process.stdout.write(c.dim("."));
    }
  }

  console.log();
  return fullContent;
}

async function generateTTS(client: OpenAI, text: string, voice: string, speed: number, language: string): Promise<Buffer> {
  const response = await withRetry(
    () => client.audio.speech.create({
      model: "gpt-4o-mini-tts",
      input: text,
      voice: voice as any,
      instructions: TTS_VOICE_INSTRUCTIONS,
      response_format: "mp3",
      speed,
      ...(language ? { language } : {}),
    }),
    { label: "TTS" },
  );

  return Buffer.from(await response.arrayBuffer());
}

// ---------------------------------------------------------------------------
// ElevenLabs TTS (legacy per-segment)
// ---------------------------------------------------------------------------

async function generateElevenLabsTTS(
  client: ElevenLabsClient,
  text: string,
  voiceId: string,
  _speed: number,
  language: string,
): Promise<Buffer> {
  const audio = await client.textToSpeech.convert(voiceId, {
    text,
    modelId: "eleven_flash_v2_5",
    outputFormat: "mp3_44100_128",
    voiceSettings: {
      stability: ELEVENLABS_VOICE_SETTINGS.stability,
      similarityBoost: ELEVENLABS_VOICE_SETTINGS.similarityBoost,
      style: ELEVENLABS_VOICE_SETTINGS.style,
      useSpeakerBoost: ELEVENLABS_VOICE_SETTINGS.useSpeakerBoost,
      speed: ELEVENLABS_VOICE_SETTINGS.speed,
    },
    ...(language ? { languageCode: language } : {}),
  });

  const reader = audio.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

// ---------------------------------------------------------------------------
// ElevenLabs TTS with timestamps (new full-audio approach)
// ---------------------------------------------------------------------------

interface ConvertWithTimestampsResult {
  audioBuffer: Buffer;
  alignment: TimestampAlignment;
  requestId?: string;
}

async function generateElevenLabsTTSWithTimestamps(
  client: ElevenLabsClient,
  text: string,
  voiceId: string,
  language: string,
  previousRequestIds?: string[],
): Promise<ConvertWithTimestampsResult> {
  const rawResponse = await client.textToSpeech.convertWithTimestamps(voiceId, {
    text,
    modelId: "eleven_flash_v2_5",
    outputFormat: "mp3_44100_128",
    voiceSettings: {
      stability: ELEVENLABS_VOICE_SETTINGS.stability,
      similarityBoost: ELEVENLABS_VOICE_SETTINGS.similarityBoost,
      style: ELEVENLABS_VOICE_SETTINGS.style,
      useSpeakerBoost: ELEVENLABS_VOICE_SETTINGS.useSpeakerBoost,
      speed: ELEVENLABS_VOICE_SETTINGS.speed,
    },
    ...(language ? { languageCode: language } : {}),
    ...(previousRequestIds && previousRequestIds.length > 0
      ? { previousRequestIds: previousRequestIds.slice(-3) }
      : {}),
  }).withRawResponse();

  const requestId = rawResponse.rawResponse.headers.get("request-id") ?? undefined;
  const data = rawResponse.data;

  const audioBuffer = Buffer.from(data.audioBase64, "base64");

  return {
    audioBuffer,
    alignment: {
      characters: data.alignment?.characters ?? [],
      characterStartTimesSeconds: data.alignment?.characterStartTimesSeconds ?? [],
      characterEndTimesSeconds: data.alignment?.characterEndTimesSeconds ?? [],
    },
    requestId,
  };
}

/**
 * Generate full audio for the entire clean text via convertWithTimestamps.
 * If text > MAX_CHUNK_LENGTH, splits into sentence-based chunks and stitches
 * with previousRequestIds for consistent tone.
 */
async function generateFullElevenLabsAudio(
  client: ElevenLabsClient,
  cleanText: string,
  voiceId: string,
  language: string,
): Promise<{ audioBuffer: Buffer; alignment: TimestampAlignment }> {
  if (cleanText.length <= MAX_CHUNK_LENGTH) {
    const result = await withRetry(
      () => generateElevenLabsTTSWithTimestamps(client, cleanText, voiceId, language),
      { label: "ElevenLabs TTS with timestamps" },
    );
    return { audioBuffer: result.audioBuffer, alignment: result.alignment };
  }

  // Split into chunks for long text
  const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if ((current + sentence).length > MAX_CHUNK_LENGTH - 500) {
      if (current) chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current) chunks.push(current.trim());

  console.log(c.dim(`  Text is ${cleanText.length} chars, split into ${chunks.length} chunks for TTS`));

  const audioBuffers: Buffer[] = [];
  const previousIds: string[] = [];
  const allChars: string[] = [];
  const allStarts: number[] = [];
  const allEnds: number[] = [];
  let timeOffset = 0;

  for (let i = 0; i < chunks.length; i++) {
    console.log(c.dim(`  [chunk ${i + 1}/${chunks.length}] Generating TTS (${chunks[i].length} chars)...`));
    const result = await withRetry(
      () => generateElevenLabsTTSWithTimestamps(client, chunks[i], voiceId, language, previousIds),
      { label: `ElevenLabs TTS chunk ${i + 1}` },
    );

    audioBuffers.push(result.audioBuffer);
    if (result.requestId) previousIds.push(result.requestId);

    // Merge alignment with time offset
    for (let j = 0; j < result.alignment.characters.length; j++) {
      allChars.push(result.alignment.characters[j]);
      allStarts.push(result.alignment.characterStartTimesSeconds[j] + timeOffset);
      allEnds.push(result.alignment.characterEndTimesSeconds[j] + timeOffset);
    }
    if (result.alignment.characterEndTimesSeconds.length > 0) {
      timeOffset = allEnds[allEnds.length - 1];
    }
  }

  return {
    audioBuffer: Buffer.concat(audioBuffers),
    alignment: {
      characters: allChars,
      characterStartTimesSeconds: allStarts,
      characterEndTimesSeconds: allEnds,
    },
  };
}

// ---------------------------------------------------------------------------
// Silence / Concat helpers
// ---------------------------------------------------------------------------

function generateSilenceMp3(seconds: number, outputPath: string, sampleRate = 44100): void {
  execSync(
    `ffmpeg -f lavfi -i anullsrc=sample_rate=${sampleRate}:channel_layout=stereo -t ${seconds} -q:a 9 -acodec libmp3lame "${outputPath}" -y`,
    { stdio: "ignore" }
  );
}

function concatenateSegments(segmentFiles: string[], outputDir: string, suffix?: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "").slice(0, 15);
  const fileLabel = suffix ? `meditation_${suffix}_${timestamp}` : `meditation_${timestamp}`;
  const finalFile = path.join(outputDir, `${fileLabel}.mp3`);
  const concatList = path.join(outputDir, "concat.txt");

  const listContent = segmentFiles.map(f => `file '${f}'`).join("\n");
  fs.writeFileSync(concatList, listContent);

  execSync(`ffmpeg -f concat -safe 0 -i "${concatList}" -c:a libmp3lame -q:a 2 "${finalFile}" -y`, { stdio: "ignore" });

  for (const f of segmentFiles) {
    try { fs.unlinkSync(f); } catch {}
  }
  fs.unlinkSync(concatList);

  return finalFile;
}

// ---------------------------------------------------------------------------
// Audio file generation (legacy per-segment approach)
// ---------------------------------------------------------------------------

function resolveElevenLabsVoiceId(voiceName: string): string {
  const entry = VALID_ELEVENLABS_VOICES.find((v) => v.label === voiceName.toLowerCase());
  return entry?.id ?? VALID_ELEVENLABS_VOICES[0].id;
}

async function generateAudioFilesLegacy(
  openaiClient: OpenAI,
  elevenLabsClient: ElevenLabsClient | null,
  segments: Segment[],
  voice: string,
  speed: number,
  language: string,
  ttsProvider: TTSProvider,
): Promise<string> {
  const outputDir = path.resolve(__dirname, "output");
  fs.mkdirSync(outputDir, { recursive: true });

  const dongSource = ttsProvider === "elevenlabs"
    ? path.resolve(__dirname, "../assets/sounds/dong-44k.mp3")
    : path.resolve(__dirname, "../assets/sounds/dong.mp3");
  const hasDong = fs.existsSync(dongSource);
  if (!hasDong) {
    console.log(c.red(`  Warning: dong file not found at ${dongSource}`));
  }

  const sampleRate = ttsProvider === "elevenlabs" ? 44100 : 48000;
  const segmentFiles: string[] = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const idx = String(i).padStart(3, "0");

    if (seg.type === "speech") {
      const name = `seg_${idx}_speech.mp3`;
      const dest = path.join(outputDir, name);
      const words = seg.text.split(/\s+/).length;
      const providerLabel = ttsProvider === "elevenlabs" ? "ElevenLabs" : "OpenAI";
      console.log(c.dim(`  [${i + 1}/${segments.length}] TTS speech via ${providerLabel} (${words} words)...`));

      let buf: Buffer;
      if (ttsProvider === "elevenlabs" && elevenLabsClient) {
        const voiceId = resolveElevenLabsVoiceId(voice);
        buf = await generateElevenLabsTTS(elevenLabsClient, seg.text, voiceId, speed, language);
      } else {
        buf = await generateTTS(openaiClient, seg.text, voice, speed, language);
      }

      fs.writeFileSync(dest, buf);
      segmentFiles.push(dest);
    } else if (seg.type === "silence") {
      const name = `seg_${idx}_silence.mp3`;
      const dest = path.join(outputDir, name);
      console.log(c.dim(`  [${i + 1}/${segments.length}] Generating ${seg.seconds}s silence...`));
      generateSilenceMp3(seg.seconds, dest, sampleRate);
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

  console.log(c.dim(`\n  Concatenating ${segmentFiles.length} segments...`));
  const finalFile = concatenateSegments(segmentFiles, outputDir, "legacy");

  return finalFile;
}

// ---------------------------------------------------------------------------
// Audio file generation (new full-audio + split approach for ElevenLabs)
// ---------------------------------------------------------------------------

async function generateAudioFilesMerged(
  elevenLabsClient: ElevenLabsClient,
  meditationText: string,
  voice: string,
  language: string,
): Promise<string> {
  const outputDir = path.resolve(__dirname, "output");
  fs.mkdirSync(outputDir, { recursive: true });

  const dongSource = path.resolve(__dirname, "../assets/sounds/dong-44k.mp3");
  const hasDong = fs.existsSync(dongSource);
  if (!hasDong) {
    console.log(c.red(`  Warning: dong-44k.mp3 not found at ${dongSource}`));
  }

  // 1. Strip markers, preserving their positions
  const { cleanText, markers } = stripMarkersWithPositions(meditationText);
  console.log(c.dim(`  Clean text: ${cleanText.length} chars, ${markers.length} markers found`));

  // 2. Generate full audio with timestamps
  const voiceId = resolveElevenLabsVoiceId(voice);
  console.log(c.dim(`  Generating full audio with timestamps via ElevenLabs...`));
  const { audioBuffer, alignment } = await generateFullElevenLabsAudio(
    elevenLabsClient, cleanText, voiceId, language,
  );

  // Save MP3 and convert to WAV for sample-accurate cutting
  // (cutting MP3 directly causes artifacts: elongated vowels, distortion at frame boundaries)
  const fullSpeechMp3 = path.join(outputDir, "full_speech.mp3");
  fs.writeFileSync(fullSpeechMp3, audioBuffer);
  const fullSpeechWav = path.join(outputDir, "full_speech.wav");
  execSync(`ffmpeg -i "${fullSpeechMp3}" "${fullSpeechWav}" -y`, { stdio: "ignore" });
  fs.unlinkSync(fullSpeechMp3);
  console.log(c.dim(`  Full speech WAV saved: ${(fs.statSync(fullSpeechWav).size / 1024).toFixed(0)} KB`));

  if (alignment.characterEndTimesSeconds.length === 0) {
    console.log(c.yellow("  Warning: No alignment data received, returning full audio without splits"));
    const mp3Out = fullSpeechWav.replace(/\.wav$/, ".mp3");
    execSync(`ffmpeg -i "${fullSpeechWav}" -c:a libmp3lame -q:a 2 "${mp3Out}" -y`, { stdio: "ignore" });
    fs.unlinkSync(fullSpeechWav);
    return mp3Out;
  }

  const totalDuration = alignment.characterEndTimesSeconds[alignment.characterEndTimesSeconds.length - 1];
  console.log(c.dim(`  Total speech duration: ${totalDuration.toFixed(1)}s, alignment chars: ${alignment.characters.length}`));

  // Convert dong to WAV for consistent concatenation
  let dongWav = "";
  if (hasDong) {
    dongWav = path.join(outputDir, "dong.wav");
    execSync(`ffmpeg -i "${dongSource}" -ar 44100 -ac 1 "${dongWav}" -y`, { stdio: "ignore" });
  }

  // 3. Compute cut times from marker positions
  const cutTimes: { time: number; marker: MarkerPosition }[] = [];
  for (const marker of markers) {
    let cutTime: number;
    if (marker.charIndex <= 0) {
      // Marker before any speech (e.g. leading [DONG] [SILENT 3s] at start of text)
      cutTime = 0;
    } else if (marker.charIndex >= cleanText.length) {
      // Marker after all speech (trailing markers)
      cutTime = totalDuration;
    } else {
      // Marker in the middle of speech — cut at end of preceding character
      const alignIdx = Math.min(marker.charIndex - 1, alignment.characterEndTimesSeconds.length - 1);
      cutTime = alignment.characterEndTimesSeconds[alignIdx];
    }
    cutTimes.push({ time: cutTime, marker });
  }

  console.log(c.dim(`  Cut points: ${cutTimes.map(ct => `${ct.time.toFixed(2)}s (${ct.marker.type}${ct.marker.type === "silence" ? ` ${ct.marker.seconds}s` : ""})`).join(", ")}`));

  // 4. Split WAV audio at the cut points (sample-accurate, no MP3 frame artifacts)
  const segmentFiles: string[] = [];
  let prevTime = 0;
  let partIdx = 0;

  for (const cut of cutTimes) {
    const duration = cut.time - prevTime;
    if (duration > 0.05) {
      const partFile = path.join(outputDir, `part_${String(partIdx).padStart(3, "0")}.wav`);
      execSync(
        `ffmpeg -i "${fullSpeechWav}" -ss ${prevTime.toFixed(4)} -t ${duration.toFixed(4)} -c:a pcm_s16le "${partFile}" -y`,
        { stdio: "ignore" },
      );
      segmentFiles.push(partFile);
      partIdx++;
    }

    // Insert silence or dong (as WAV)
    if (cut.marker.type === "silence" && cut.marker.seconds) {
      const silenceFile = path.join(outputDir, `silence_${String(partIdx).padStart(3, "0")}.wav`);
      execSync(
        `ffmpeg -f lavfi -i anullsrc=sample_rate=44100:channel_layout=mono -t ${cut.marker.seconds} -c:a pcm_s16le "${silenceFile}" -y`,
        { stdio: "ignore" },
      );
      segmentFiles.push(silenceFile);
      console.log(c.dim(`  + ${cut.marker.seconds}s silence`));
      partIdx++;
    } else if (cut.marker.type === "dong" && dongWav) {
      const dongFile = path.join(outputDir, `dong_${String(partIdx).padStart(3, "0")}.wav`);
      fs.copyFileSync(dongWav, dongFile);
      segmentFiles.push(dongFile);
      console.log(c.dim(`  + dong`));
      partIdx++;
    }

    prevTime = cut.time;
  }

  // Last part: from last cut to end
  if (prevTime < totalDuration - 0.05) {
    const lastPartFile = path.join(outputDir, `part_${String(partIdx).padStart(3, "0")}.wav`);
    execSync(
      `ffmpeg -i "${fullSpeechWav}" -ss ${prevTime.toFixed(4)} -c:a pcm_s16le "${lastPartFile}" -y`,
      { stdio: "ignore" },
    );
    segmentFiles.push(lastPartFile);
  }

  // 5. Concatenate all WAV parts → final MP3
  console.log(c.dim(`\n  Concatenating ${segmentFiles.length} parts (speech + silence + dong)...`));
  const finalFile = concatenateSegments(segmentFiles, outputDir, "merged");

  // Cleanup temp files
  try { fs.unlinkSync(fullSpeechWav); } catch {}
  if (dongWav) try { fs.unlinkSync(dongWav); } catch {}

  return finalFile;
}

// ---------------------------------------------------------------------------
// Audio file generation (dispatcher)
// ---------------------------------------------------------------------------

async function generateAudioFiles(
  openaiClient: OpenAI,
  elevenLabsClient: ElevenLabsClient | null,
  segments: Segment[],
  meditationText: string,
  voice: string,
  speed: number,
  language: string,
  ttsProvider: TTSProvider,
  noMerge: boolean,
): Promise<string> {
  // New full-audio approach for ElevenLabs (unless --no-merge)
  if (ttsProvider === "elevenlabs" && elevenLabsClient && !noMerge) {
    return generateAudioFilesMerged(elevenLabsClient, meditationText, voice, language);
  }

  // Legacy per-segment approach
  return generateAudioFilesLegacy(openaiClient, elevenLabsClient, segments, voice, speed, language, ttsProvider);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const { prompt, type, duration, voice, speed, audio, language, ttsProvider, noMerge } = parseArgs();

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

  let elevenLabsClient: ElevenLabsClient | null = null;
  if (ttsProvider === "elevenlabs") {
    const elApiKey = process.env.ELEVENLABS_API_KEY;
    if (!elApiKey) {
      console.error(c.red("Error: ELEVENLABS_API_KEY not found. Set it in .env or as env variable."));
      process.exit(1);
    }
    elevenLabsClient = new ElevenLabsClient({ apiKey: elApiKey });
  }

  console.log(c.bold("\n=== ZenAI Meditation Generator ===\n"));
  console.log(`  Prompt:       "${prompt}"`);
  console.log(`  Type:         ${type}`);
  console.log(`  Duration:     ${duration} min`);
  console.log(`  TTS Provider: ${ttsProvider}`);
  console.log(`  Voice:        ${voice}`);
  console.log(`  Speed:        ${speed}`);
  console.log(`  Language:     ${language || "auto"}`);
  console.log(`  Audio:        ${audio ? "yes" : "no (text only)"}`);
  if (ttsProvider === "elevenlabs") {
    console.log(`  Mode:         ${noMerge ? "legacy (per-segment)" : "merged (full audio + split)"}`);
  }
  const client = createOpenAIClient(apiKey);

  console.log(c.dim("\nGenerating text with GPT-5.2 (Responses API + reasoning)...\n"));

  const text = await generateText(client, prompt, type, duration, language);

  console.log(c.bold("--- Meditation Script ---\n"));
  printColoredText(text);

  const segments = parseSegments(text);
  printStats(segments, speed);

  if (audio) {
    console.log(c.dim("\nGenerating audio files...\n"));
    const finalFile = await generateAudioFiles(client, elevenLabsClient, segments, text, voice, speed, language, ttsProvider, noMerge);
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
