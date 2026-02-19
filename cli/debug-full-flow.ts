import * as path from "path";
import * as fs from "fs";
import { execSync } from "child_process";
import { config } from "dotenv";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { stripMarkersWithPositions } from "../src/infrastructure/audio-assembler/MarkerStripper";

config({ path: path.resolve(__dirname, "../.env") });

const TEST_TEXT = `Chiudi gli occhi e rilassati. [SILENT 3s] Respira profondamente, lascia andare ogni pensiero. [DONG] Ora ascolta il silenzio intorno a te. [SILENT 2s] Sei in pace.`;

const VOICE_SETTINGS = { stability: 0.65, similarityBoost: 0.9, style: 0.4, useSpeakerBoost: true, speed: 0.7 };

async function main() {
  const elApiKey = process.env.ELEVENLABS_API_KEY;
  if (!elApiKey) { console.error("ELEVENLABS_API_KEY not found"); process.exit(1); }

  const client = new ElevenLabsClient({ apiKey: elApiKey });
  const voiceId = "KoVIHoyLDrQyd4pGalbs";

  const outputDir = path.resolve(__dirname, "output", "debug");
  fs.mkdirSync(outputDir, { recursive: true });
  // Clean up previous debug files
  for (const f of fs.readdirSync(outputDir)) {
    fs.unlinkSync(path.join(outputDir, f));
  }

  const dongSource = path.resolve(__dirname, "../assets/sounds/dong.mp3");
  const hasDong = fs.existsSync(dongSource);
  console.log(`Dong file exists: ${hasDong}${hasDong ? ` (${fs.statSync(dongSource).size} bytes)` : ""}`);

  // 1. Strip markers
  const { cleanText, markers } = stripMarkersWithPositions(TEST_TEXT);
  console.log(`\nClean text (${cleanText.length} chars): "${cleanText}"`);
  console.log(`Markers: ${markers.length}`);

  // 2. Call ElevenLabs
  console.log("\nCalling ElevenLabs convertWithTimestamps...");
  const rawResponse = await client.textToSpeech.convertWithTimestamps(voiceId, {
    text: cleanText,
    modelId: "eleven_flash_v2_5",
    outputFormat: "mp3_44100_128",
    voiceSettings: VOICE_SETTINGS,
  }).withRawResponse();

  const data = rawResponse.data;
  const alignment = data.alignment!;
  const alignEnds = alignment.characterEndTimesSeconds;
  const totalDuration = alignEnds[alignEnds.length - 1];

  // Save full audio
  const audioBuffer = Buffer.from(data.audioBase64, "base64");
  const fullSpeechPath = path.join(outputDir, "full_speech.mp3");
  fs.writeFileSync(fullSpeechPath, audioBuffer);
  console.log(`Full speech: ${(audioBuffer.length/1024).toFixed(0)} KB, ${totalDuration.toFixed(2)}s`);

  // 3. Compute cut times
  const cutTimes: { time: number; type: string; seconds?: number }[] = [];
  for (const marker of markers) {
    const alignIdx = Math.min(marker.charIndex - 1, alignEnds.length - 1);
    const cutTime = alignIdx >= 0 ? alignEnds[alignIdx] : 0;
    cutTimes.push({ time: cutTime, type: marker.type, seconds: marker.seconds });
    console.log(`Cut: ${cutTime.toFixed(3)}s → ${marker.type}${marker.seconds ? ` ${marker.seconds}s` : ""}`);
  }

  // 4. Split with ffmpeg and assemble
  const segmentFiles: string[] = [];
  let prevTime = 0;
  let partIdx = 0;

  for (const cut of cutTimes) {
    const duration = cut.time - prevTime;
    if (duration > 0.05) {
      const partFile = path.join(outputDir, `part_${String(partIdx).padStart(3, "0")}.mp3`);
      const cmd = `ffmpeg -i "${fullSpeechPath}" -ss ${prevTime.toFixed(4)} -t ${duration.toFixed(4)} -c:a libmp3lame -q:a 2 "${partFile}" -y`;
      console.log(`\n  ffmpeg: -ss ${prevTime.toFixed(2)} -t ${duration.toFixed(2)} → ${path.basename(partFile)}`);
      execSync(cmd, { stdio: "ignore" });

      // Verify the part
      const partInfo = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${partFile}"`, { encoding: "utf8" }).trim();
      console.log(`    → actual duration: ${parseFloat(partInfo).toFixed(2)}s`);

      segmentFiles.push(partFile);
      partIdx++;
    }

    // Insert silence or dong
    if (cut.type === "silence" && cut.seconds) {
      const silenceFile = path.join(outputDir, `silence_${String(partIdx).padStart(3, "0")}.mp3`);
      execSync(`ffmpeg -f lavfi -i anullsrc=sample_rate=44100:channel_layout=stereo -t ${cut.seconds} -q:a 9 -acodec libmp3lame "${silenceFile}" -y`, { stdio: "ignore" });
      console.log(`  + silence ${cut.seconds}s → ${path.basename(silenceFile)}`);
      segmentFiles.push(silenceFile);
      partIdx++;
    } else if (cut.type === "dong" && hasDong) {
      const dongFile = path.join(outputDir, `dong_${String(partIdx).padStart(3, "0")}.mp3`);
      fs.copyFileSync(dongSource, dongFile);
      console.log(`  + dong → ${path.basename(dongFile)}`);
      segmentFiles.push(dongFile);
      partIdx++;
    }

    prevTime = cut.time;
  }

  // Last part
  if (prevTime < totalDuration - 0.05) {
    const lastPartFile = path.join(outputDir, `part_${String(partIdx).padStart(3, "0")}.mp3`);
    const lastDuration = totalDuration - prevTime;
    console.log(`\n  ffmpeg: -ss ${prevTime.toFixed(2)} (last part, ${lastDuration.toFixed(2)}s) → ${path.basename(lastPartFile)}`);
    execSync(`ffmpeg -i "${fullSpeechPath}" -ss ${prevTime.toFixed(4)} -c:a libmp3lame -q:a 2 "${lastPartFile}" -y`, { stdio: "ignore" });
    segmentFiles.push(lastPartFile);
  }

  // 5. Show final assembly order
  console.log("\n=== Assembly Order ===");
  for (let i = 0; i < segmentFiles.length; i++) {
    const info = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${segmentFiles[i]}"`, { encoding: "utf8" }).trim();
    console.log(`  ${i + 1}. ${path.basename(segmentFiles[i])} (${parseFloat(info).toFixed(2)}s)`);
  }

  // 6. Concatenate
  const concatList = path.join(outputDir, "concat.txt");
  fs.writeFileSync(concatList, segmentFiles.map(f => `file '${f}'`).join("\n"));
  const finalFile = path.join(outputDir, "debug_final.mp3");
  execSync(`ffmpeg -f concat -safe 0 -i "${concatList}" -c:a libmp3lame -q:a 2 "${finalFile}" -y`, { stdio: "ignore" });

  const finalInfo = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${finalFile}"`, { encoding: "utf8" }).trim();
  console.log(`\n=== Final: ${path.basename(finalFile)} (${parseFloat(finalInfo).toFixed(2)}s) ===`);
  console.log(`Expected: speech(${totalDuration.toFixed(1)}s) + silences(5s) + dong(~2.5s) = ~${(totalDuration + 5 + 2.5).toFixed(1)}s`);
  console.log(`Actual: ${finalInfo}s`);
  console.log(`\nFiles kept in ${outputDir} for inspection.`);
}

main().catch(err => { console.error("Error:", err.message); process.exit(1); });
