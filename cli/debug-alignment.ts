import * as path from "path";
import * as fs from "fs";
import { config } from "dotenv";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { stripMarkersWithPositions } from "../src/infrastructure/audio-assembler/MarkerStripper";

config({ path: path.resolve(__dirname, "../.env") });

const TEST_TEXT = `Chiudi gli occhi e rilassati. [SILENT 3s] Respira profondamente, lascia andare ogni pensiero. [DONG] Ora ascolta il silenzio intorno a te. [SILENT 2s] Sei in pace.`;

async function main() {
  const elApiKey = process.env.ELEVENLABS_API_KEY;
  if (!elApiKey) {
    console.error("ELEVENLABS_API_KEY not found");
    process.exit(1);
  }

  const client = new ElevenLabsClient({ apiKey: elApiKey });
  const voiceId = "KoVIHoyLDrQyd4pGalbs"; // autumn-veil

  // 1. Strip markers
  const { cleanText, markers } = stripMarkersWithPositions(TEST_TEXT);
  console.log("=== Original Text ===");
  console.log(TEST_TEXT);
  console.log("\n=== Clean Text ===");
  console.log(JSON.stringify(cleanText));
  console.log(`Length: ${cleanText.length}`);

  console.log("\n=== Markers ===");
  for (const m of markers) {
    console.log(`  ${m.type}${m.seconds ? ` ${m.seconds}s` : ""} @ charIndex=${m.charIndex}`);
    const before = cleanText.substring(Math.max(0, m.charIndex - 15), m.charIndex);
    const after = cleanText.substring(m.charIndex, Math.min(cleanText.length, m.charIndex + 15));
    console.log(`    "...${before}" |CUT| "${after}..."`);
  }

  // 2. Call ElevenLabs convertWithTimestamps
  console.log("\n=== Calling ElevenLabs convertWithTimestamps ===");
  const rawResponse = await client.textToSpeech.convertWithTimestamps(voiceId, {
    text: cleanText,
    modelId: "eleven_flash_v2_5",
    outputFormat: "mp3_44100_128",
    voiceSettings: { stability: 0.65, similarityBoost: 0.9, style: 0.4, useSpeakerBoost: true, speed: 0.7 },
  }).withRawResponse();

  const data = rawResponse.data;
  const alignment = data.alignment;
  const normAlignment = data.normalizedAlignment;

  console.log(`\nAudio base64 length: ${data.audioBase64.length}`);
  console.log(`Alignment chars count: ${alignment?.characters?.length ?? 0}`);
  console.log(`NormAlignment chars count: ${normAlignment?.characters?.length ?? 0}`);

  if (!alignment?.characters?.length) {
    console.error("No alignment data!");
    return;
  }

  // 3. Compare alignment characters with our clean text
  const alignChars = alignment.characters;
  const alignEnds = alignment.characterEndTimesSeconds;
  const totalDuration = alignEnds[alignEnds.length - 1];

  console.log(`\nTotal audio duration: ${totalDuration.toFixed(2)}s`);

  console.log("\n=== Character-by-Character Comparison ===");
  console.log("idx | our | align | endTime | match?");
  console.log("-".repeat(50));

  const maxLen = Math.max(cleanText.length, alignChars.length);
  let mismatches = 0;
  for (let i = 0; i < Math.min(maxLen, 100); i++) {
    const ourChar = i < cleanText.length ? cleanText[i] : "---";
    const alignChar = i < alignChars.length ? alignChars[i] : "---";
    const endTime = i < alignEnds.length ? alignEnds[i].toFixed(3) : "---";
    const match = ourChar === alignChar ? "OK" : "MISMATCH";
    if (ourChar !== alignChar) mismatches++;

    const displayOur = ourChar === " " ? "SPC" : ourChar === "\n" ? "\\n" : ourChar;
    const displayAlign = alignChar === " " ? "SPC" : alignChar === "\n" ? "\\n" : alignChar;
    console.log(`${String(i).padStart(3)} | ${displayOur.padEnd(3)} | ${displayAlign.padEnd(5)} | ${String(endTime).padStart(7)} | ${match}`);
  }
  if (maxLen > 100) console.log(`... (${maxLen - 100} more characters)`);

  console.log(`\nClean text length: ${cleanText.length}, Alignment length: ${alignChars.length}`);
  console.log(`Mismatches: ${mismatches}`);

  // 4. Show where cuts would be made
  console.log("\n=== Cut Time Mapping ===");
  for (const marker of markers) {
    const alignIdx = Math.min(marker.charIndex - 1, alignEnds.length - 1);
    const cutTime = alignIdx >= 0 ? alignEnds[alignIdx] : 0;
    const charAtIdx = alignIdx >= 0 && alignIdx < alignChars.length ? alignChars[alignIdx] : "???";
    console.log(`  ${marker.type}${marker.seconds ? ` ${marker.seconds}s` : ""}: charIndex=${marker.charIndex} → alignIdx=${alignIdx} → char="${charAtIdx}" → cutTime=${cutTime.toFixed(3)}s`);
  }

  // Save audio for reference
  const outputDir = path.resolve(__dirname, "output");
  fs.mkdirSync(outputDir, { recursive: true });
  const audioBuffer = Buffer.from(data.audioBase64, "base64");
  const audioPath = path.join(outputDir, "debug_full_speech.mp3");
  fs.writeFileSync(audioPath, audioBuffer);
  console.log(`\nFull speech saved to: ${audioPath} (${(audioBuffer.length/1024).toFixed(0)} KB, ${totalDuration.toFixed(1)}s)`);
}

main().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
