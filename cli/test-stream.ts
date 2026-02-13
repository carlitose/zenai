import * as https from "https";
import * as path from "path";
import { config } from "dotenv";
import {
  MEDITATION_SYSTEM_PROMPT,
  WORDS_PER_MINUTE,
  TEXT_GENERATION_MODEL,
  TEXT_GENERATION_REASONING,
  TEXT_GENERATION_MAX_OUTPUT_TOKENS,
  buildUserPrompt,
} from "../src/shared/prompts/meditation-system-prompt";

config({ path: path.resolve(__dirname, "../.env") });

// ---------------------------------------------------------------------------
// CLI arg parsing
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  let prompt = "A gentle guided meditation to find inner peace and calm";
  let type = "guided";
  let duration = 10;
  let language = "";

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--prompt":
      case "-p":
        prompt = args[++i] ?? "";
        break;
      case "--type":
      case "-t":
        type = args[++i] ?? "guided";
        break;
      case "--duration":
      case "-d":
        duration = parseInt(args[++i], 10) || 10;
        break;
      case "--language":
      case "-l":
        language = args[++i] ?? "";
        break;
      case "--help":
      case "-h":
        console.log(`
Usage: npx tsx cli/test-stream.ts [options]

Options:
  -p, --prompt <text>     Meditation prompt [default: "A gentle guided meditation..."]
  -t, --type <type>       Meditation type [guided]
  -d, --duration <min>    Duration in minutes [10]
  -l, --language <lang>   Language: en, it, fr, etc. [auto-detect]
  -h, --help              Show this help
`);
        process.exit(0);
      default:
        if (!args[i].startsWith("-") && !prompt) {
          prompt = args[i];
        }
        break;
    }
  }

  return { prompt, type, duration, language };
}

// ---------------------------------------------------------------------------
// SSE parsing logic (same logic used in React Native via XHR)
// ---------------------------------------------------------------------------

function parseSSEChunk(newData: string, buffer: string): { fullContent: string; remaining: string; deltaCount: number } {
  const combined = buffer + newData;
  const lines = combined.split("\n");
  const remaining = lines.pop()!;
  let fullContent = "";
  let deltaCount = 0;

  for (const line of lines) {
    if (!line.startsWith("data: ")) continue;
    const data = line.slice(6);
    if (data === "[DONE]") continue;
    try {
      const event = JSON.parse(data);
      if (event.type === "response.output_text.delta") {
        fullContent += event.delta;
        deltaCount++;
      }
    } catch {}
  }

  return { fullContent, remaining, deltaCount };
}

// ---------------------------------------------------------------------------
// Streaming via https.request (chunked reading, mirrors XHR onreadystatechange in RN)
// ---------------------------------------------------------------------------

function streamGenerateText(
  apiKey: string,
  prompt: string,
  type: string,
  durationMinutes: number,
  language: string,
): Promise<string> {
  const userPrompt = buildUserPrompt({
    prompt,
    type,
    durationMinutes,
    language: language || undefined,
  });

  console.log("\n--- User Prompt ---");
  console.log(userPrompt);
  console.log("-------------------\n");

  const body = JSON.stringify({
    model: TEXT_GENERATION_MODEL,
    instructions: MEDITATION_SYSTEM_PROMPT,
    input: [{ role: "user", content: userPrompt }],
    reasoning: TEXT_GENERATION_REASONING,
    max_output_tokens: TEXT_GENERATION_MAX_OUTPUT_TOKENS,
    stream: true,
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.openai.com",
        path: "/v1/responses",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          let errorBody = "";
          res.on("data", (chunk: Buffer) => { errorBody += chunk.toString(); });
          res.on("end", () => reject(new Error(`HTTP ${res.statusCode}: ${errorBody}`)));
          return;
        }

        let buffer = "";
        let fullContent = "";
        let totalDeltas = 0;

        res.on("data", (chunk: Buffer) => {
          const result = parseSSEChunk(chunk.toString(), buffer);
          fullContent += result.fullContent;
          buffer = result.remaining;
          totalDeltas += result.deltaCount;
          if (totalDeltas % 10 === 0 && result.deltaCount > 0) process.stdout.write(".");
        });

        res.on("end", () => {
          console.log(`\n\nReceived ${totalDeltas} delta events`);
          resolve(fullContent);
        });

        res.on("error", reject);
      },
    );

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const { prompt, type, duration, language } = parseArgs();

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("Error: OPENAI_API_KEY not found. Set it in .env or as env variable.");
    process.exit(1);
  }

  console.log("=== ZenAI Stream Test (chunked, no ReadableStream) ===");
  console.log(`  Model:    ${TEXT_GENERATION_MODEL}`);
  console.log(`  Reasoning: ${JSON.stringify(TEXT_GENERATION_REASONING)}`);
  console.log(`  Max tokens: ${TEXT_GENERATION_MAX_OUTPUT_TOKENS}`);
  console.log(`  Prompt:   "${prompt}"`);
  console.log(`  Type:     ${type}`);
  console.log(`  Duration: ${duration} min`);
  console.log(`  Language: ${language || "auto"}`);

  const startTime = Date.now();

  const text = await streamGenerateText(apiKey, prompt, type, duration, language);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const estimatedSpeechMin = wordCount / WORDS_PER_MINUTE;

  console.log("\n--- Statistics ---");
  console.log(`  Words:          ${wordCount}`);
  console.log(`  Est. speech:    ${estimatedSpeechMin.toFixed(1)} min`);
  console.log(`  Generation time: ${elapsed}s`);
  console.log(`  Text length:    ${text.length} chars`);

  console.log("\n--- First 500 chars ---");
  console.log(text.slice(0, 500));
  console.log("...\n");
}

main().catch((err) => {
  console.error(`\nFatal error: ${err.message}`);
  process.exit(1);
});
