/**
 * End-to-end test for the "Full Audio + Split" mobile flow.
 *
 * This script exercises the EXACT SAME pure-JS logic that runs on device:
 *   - MarkerStripper.stripMarkersWithPositions()
 *   - Mp3FrameUtils (parseFrameHeader, skipId3v2, etc.)
 *   - Mp3FrameSplitter.split() algorithm (reimplemented here because the
 *     module imports expo-file-system at the top level)
 *   - ElevenLabs /with-timestamps API via raw fetch (same as ElevenLabsTTSAdapter)
 *   - MP3 frame-level concatenation (same as Mp3Concatenator)
 *
 * Run:
 *   npx tsx cli/test-mobile-flow.ts
 *   npx tsx cli/test-mobile-flow.ts --live          # calls ElevenLabs API
 *   npx tsx cli/test-mobile-flow.ts --live --text "your text with [DONG] markers"
 */
import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";

// --- Pure JS imports from the app (no expo deps) ---
import { stripMarkersWithPositions, MarkerPosition } from "../src/infrastructure/audio-assembler/MarkerStripper";
import {
  parseFrameHeader,
  skipId3v2,
  findDataEnd,
  isFrameSync,
  getFrameSize,
  isXingFrame,
  stripMp3Metadata,
  calculateMp3Duration,
  Mp3FrameInfo,
} from "../src/infrastructure/audio/Mp3FrameUtils";

config({ path: path.resolve(__dirname, "../.env") });

// ---------------------------------------------------------------------------
// ANSI helpers
// ---------------------------------------------------------------------------
const c = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ${c.green("PASS")} ${message}`);
    passed++;
  } else {
    console.log(`  ${c.red("FAIL")} ${message}`);
    failed++;
  }
}

function assertClose(actual: number, expected: number, tolerance: number, message: string) {
  const diff = Math.abs(actual - expected);
  if (diff <= tolerance) {
    console.log(`  ${c.green("PASS")} ${message} (${actual.toFixed(4)} ~ ${expected.toFixed(4)}, diff=${diff.toFixed(4)})`);
    passed++;
  } else {
    console.log(`  ${c.red("FAIL")} ${message} (${actual.toFixed(4)} != ${expected.toFixed(4)}, diff=${diff.toFixed(4)} > ${tolerance})`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// Reimplementation of Mp3FrameSplitter.split() using imported Mp3FrameUtils
// (Same algorithm as the mobile code — we can't import the module directly
//  because it has `import { File, Directory, Paths } from 'expo-file-system'`)
// ---------------------------------------------------------------------------
interface SplitResult {
  parts: Uint8Array[];
  actualCutTimes: number[];
}

/** Seconds to shift the cut point. Positive = forward (into next segment), negative = backward. 0 = no shift. */
const CUT_PAD_SECONDS = 0;

/** Rounding direction when snapping to frame boundaries: 'floor' or 'ceil'. */
const CUT_ROUNDING: 'floor' | 'ceil' = 'floor';

function splitMp3(audioData: Uint8Array, cutTimes: number[]): SplitResult {
  // 1. Strip metadata
  let start = skipId3v2(audioData);
  const end = findDataEnd(audioData);

  // Skip Xing/Info frame if present
  if (start < end - 4 && isFrameSync(audioData, start)) {
    const frameSize = getFrameSize(audioData, start);
    if (frameSize > 0 && isXingFrame(audioData, start, frameSize, end)) {
      start += frameSize;
    }
  }

  // 2. Scan all frames
  const frameOffsets: number[] = [];
  const frameCumulativeTimes: number[] = [];
  let cumulativeTime = 0;
  let pos = start;

  while (pos < end) {
    const info = parseFrameHeader(audioData, pos);
    if (!info || info.size <= 0) {
      pos++;
      while (pos < end - 1 && !isFrameSync(audioData, pos)) pos++;
      continue;
    }
    frameOffsets.push(pos);
    frameCumulativeTimes.push(cumulativeTime);
    cumulativeTime += info.duration;
    pos += info.size;
  }

  frameOffsets.push(pos);
  frameCumulativeTimes.push(cumulativeTime);

  if (cutTimes.length === 0) {
    return { parts: [audioData.subarray(start, end)], actualCutTimes: [] };
  }

  // 3. Binary search for frame boundaries
  const sortedCuts = [...cutTimes].sort((a, b) => a - b);
  const actualCutTimes: number[] = [];
  const cutFrameIndices: number[] = [];

  for (const cutTime of sortedCuts) {
    if (cutTime <= 0) {
      cutFrameIndices.push(0);
      actualCutTimes.push(0);
      continue;
    }
    if (cutTime >= cumulativeTime) {
      cutFrameIndices.push(frameOffsets.length - 1);
      actualCutTimes.push(cumulativeTime);
      continue;
    }

    const adjustedCut = cutTime + CUT_PAD_SECONDS;

    let lo = 0;
    let hi = frameCumulativeTimes.length - 1;

    if (CUT_ROUNDING === 'floor') {
      // Round DOWN: last frame boundary at or before the cut time.
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (frameCumulativeTimes[mid] <= adjustedCut) lo = mid;
        else hi = mid - 1;
      }
    } else {
      // Round UP: first frame boundary at or after the cut time.
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (frameCumulativeTimes[mid] < adjustedCut) lo = mid + 1;
        else hi = mid;
      }
    }

    cutFrameIndices.push(lo);
    actualCutTimes.push(frameCumulativeTimes[lo]);
  }

  // 4. Build parts
  const parts: Uint8Array[] = [];
  let prevFrameIdx = 0;
  for (const frameIdx of cutFrameIndices) {
    const startByte = frameOffsets[prevFrameIdx];
    const endByte = frameOffsets[frameIdx];
    parts.push(endByte > startByte ? audioData.subarray(startByte, endByte) : new Uint8Array(0));
    prevFrameIdx = frameIdx;
  }
  const lastStart = frameOffsets[prevFrameIdx];
  const lastEnd = frameOffsets[frameOffsets.length - 1];
  parts.push(lastEnd > lastStart ? audioData.subarray(lastStart, lastEnd) : new Uint8Array(0));

  return { parts, actualCutTimes };
}

// ---------------------------------------------------------------------------
// Reimplementation of stripMetadata (same as Mp3Concatenator.stripMetadata)
// ---------------------------------------------------------------------------
function stripMetadata(data: Uint8Array): Uint8Array {
  let start = skipId3v2(data);
  const end = findDataEnd(data);
  if (start < end - 4 && isFrameSync(data, start)) {
    const frameSize = getFrameSize(data, start);
    if (frameSize > 0 && isXingFrame(data, start, frameSize, end)) {
      start += frameSize;
    }
  }
  return data.subarray(start, end);
}

function concatenateBuffers(buffers: Uint8Array[]): Uint8Array {
  let totalLen = 0;
  for (const b of buffers) totalLen += b.length;
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const b of buffers) {
    result.set(b, offset);
    offset += b.length;
  }
  return result;
}

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const isLive = args.includes("--live");
let customText = "";
const textIdx = args.indexOf("--text");
if (textIdx >= 0 && args[textIdx + 1]) customText = args[textIdx + 1];

// ---------------------------------------------------------------------------
// Test 1: Mp3FrameUtils with a real MP3 file
// ---------------------------------------------------------------------------
async function testMp3FrameUtils() {
  console.log(c.bold("\n=== Test 1: Mp3FrameUtils with real MP3 files ===\n"));

  const dongPath = path.resolve(__dirname, "../assets/sounds/dong-44k.mp3");
  const silencePath = path.resolve(__dirname, "../assets/sounds/silence-44k.mp3");

  for (const [label, filePath] of [["dong-44k.mp3", dongPath], ["silence-44k.mp3", silencePath]]) {
    if (!fs.existsSync(filePath)) {
      console.log(c.yellow(`  SKIP ${label}: file not found`));
      continue;
    }

    const data = new Uint8Array(fs.readFileSync(filePath));
    console.log(c.dim(`  ${label}: ${data.length} bytes`));

    // skipId3v2
    const dataStart = skipId3v2(data);
    console.log(c.dim(`    ID3v2 tag: ${dataStart > 0 ? `${dataStart} bytes` : "none"}`));

    // findDataEnd
    const dataEnd = findDataEnd(data);
    console.log(c.dim(`    Data end: ${dataEnd} (ID3v1: ${dataEnd < data.length ? "yes" : "no"})`));

    // Parse first frame
    let frameStart = dataStart;
    // Skip Xing frame if present
    if (isFrameSync(data, frameStart)) {
      const fSize = getFrameSize(data, frameStart);
      if (fSize > 0 && isXingFrame(data, frameStart, fSize, dataEnd)) {
        console.log(c.dim(`    Xing/Info frame: ${fSize} bytes (skipped)`));
        frameStart += fSize;
      }
    }

    const firstFrame = parseFrameHeader(data, frameStart);
    assert(firstFrame !== null, `${label}: first frame parsed successfully`);
    if (firstFrame) {
      assert(firstFrame.sampleRate === 44100, `${label}: sample rate is 44100 (got ${firstFrame.sampleRate})`);
      assert(firstFrame.samplesPerFrame === 1152, `${label}: 1152 samples/frame (MPEG1)`);
      assert(firstFrame.size > 0, `${label}: frame size > 0 (${firstFrame.size} bytes)`);
      assertClose(firstFrame.duration, 1152 / 44100, 0.0001, `${label}: frame duration ~26.12ms`);
    }

    // Count all frames and total duration
    let pos = frameStart;
    let frameCount = 0;
    let totalDuration = 0;
    while (pos < dataEnd) {
      const info = parseFrameHeader(data, pos);
      if (!info) { pos++; continue; }
      frameCount++;
      totalDuration += info.duration;
      pos += info.size;
    }

    console.log(c.dim(`    Frames: ${frameCount}, total duration: ${totalDuration.toFixed(3)}s`));
    assert(frameCount > 0, `${label}: has audio frames`);
    assert(totalDuration > 0, `${label}: total duration > 0`);
  }
}

// ---------------------------------------------------------------------------
// Test 2: Mp3 Split & Reassemble (lossless round-trip)
// ---------------------------------------------------------------------------
async function testSplitReassemble() {
  console.log(c.bold("\n=== Test 2: MP3 Split & Reassemble Round-trip ===\n"));

  const dongPath = path.resolve(__dirname, "../assets/sounds/dong-44k.mp3");
  if (!fs.existsSync(dongPath)) {
    console.log(c.yellow("  SKIP: dong-44k.mp3 not found"));
    return;
  }

  const original = new Uint8Array(fs.readFileSync(dongPath));
  const stripped = stripMetadata(original);
  console.log(c.dim(`  Original: ${original.length} bytes, stripped: ${stripped.length} bytes`));

  // Count frames to know total duration
  let pos = 0;
  let totalDuration = 0;
  while (pos < stripped.length) {
    const info = parseFrameHeader(stripped, pos);
    if (!info) { pos++; continue; }
    totalDuration += info.duration;
    pos += info.size;
  }
  console.log(c.dim(`  Total duration: ${totalDuration.toFixed(3)}s`));

  // Split at midpoint
  const midTime = totalDuration / 2;
  console.log(c.dim(`  Splitting at midpoint: ${midTime.toFixed(3)}s`));

  const { parts, actualCutTimes } = splitMp3(original, [midTime]);

  assert(parts.length === 2, `split into 2 parts (got ${parts.length})`);
  assert(actualCutTimes.length === 1, `1 actual cut time`);
  assertClose(actualCutTimes[0], midTime, 0.03, `actual cut ~midpoint (tolerance 30ms, frame rounding only)`);

  const part1Len = parts[0].length;
  const part2Len = parts[1].length;
  assert(part1Len > 0, `part 1 has data (${part1Len} bytes)`);
  assert(part2Len > 0, `part 2 has data (${part2Len} bytes)`);

  // Reassemble: just concatenate the raw frame data
  const reassembled = concatenateBuffers(parts);
  assert(reassembled.length === stripped.length, `reassembled length matches stripped (${reassembled.length} == ${stripped.length})`);

  // Byte-for-byte comparison
  let mismatchCount = 0;
  for (let i = 0; i < reassembled.length; i++) {
    if (reassembled[i] !== stripped[i]) mismatchCount++;
  }
  assert(mismatchCount === 0, `byte-for-byte identical after reassembly (mismatches: ${mismatchCount})`);

  // Split at multiple points
  const thirds = [totalDuration / 3, (2 * totalDuration) / 3];
  const result3 = splitMp3(original, thirds);
  assert(result3.parts.length === 3, `split at 2 points → 3 parts`);
  const reassembled3 = concatenateBuffers(result3.parts);
  assert(reassembled3.length === stripped.length, `3-part reassembly matches stripped length`);

  let mismatch3 = 0;
  for (let i = 0; i < reassembled3.length; i++) {
    if (reassembled3[i] !== stripped[i]) mismatch3++;
  }
  assert(mismatch3 === 0, `3-part reassembly byte-for-byte identical`);
}

// ---------------------------------------------------------------------------
// Test 3: Split with edge cases (cut at 0, cut at end, empty parts)
// ---------------------------------------------------------------------------
async function testSplitEdgeCases() {
  console.log(c.bold("\n=== Test 3: Split Edge Cases ===\n"));

  const dongPath = path.resolve(__dirname, "../assets/sounds/dong-44k.mp3");
  if (!fs.existsSync(dongPath)) {
    console.log(c.yellow("  SKIP: dong-44k.mp3 not found"));
    return;
  }

  const data = new Uint8Array(fs.readFileSync(dongPath));

  // Compute total duration
  let start = skipId3v2(data);
  const end = findDataEnd(data);
  if (isFrameSync(data, start)) {
    const fs2 = getFrameSize(data, start);
    if (fs2 > 0 && isXingFrame(data, start, fs2, end)) start += fs2;
  }
  let totalDuration = 0;
  let pos = start;
  while (pos < end) {
    const info = parseFrameHeader(data, pos);
    if (!info) { pos++; continue; }
    totalDuration += info.duration;
    pos += info.size;
  }

  // Cut at 0 (leading marker)
  {
    const { parts, actualCutTimes } = splitMp3(data, [0]);
    assert(parts.length === 2, `cut at 0: 2 parts`);
    assert(parts[0].length === 0, `cut at 0: first part is empty`);
    assert(parts[1].length > 0, `cut at 0: second part has data`);
    assert(actualCutTimes[0] === 0, `cut at 0: actual cut time is 0`);
  }

  // Cut at end (trailing marker)
  {
    const { parts, actualCutTimes } = splitMp3(data, [totalDuration]);
    assert(parts.length === 2, `cut at end: 2 parts`);
    assert(parts[0].length > 0, `cut at end: first part has data`);
    assert(parts[1].length === 0, `cut at end: second part is empty`);
  }

  // Multiple cuts at 0 (leading markers pattern: [DONG][SILENT 3s][DONG])
  {
    const { parts, actualCutTimes } = splitMp3(data, [0, 0, 0]);
    assert(parts.length === 4, `3 cuts at 0: 4 parts`);
    assert(parts[0].length === 0, `first 3 parts empty`);
    assert(parts[1].length === 0, `first 3 parts empty`);
    assert(parts[2].length === 0, `first 3 parts empty`);
    assert(parts[3].length > 0, `last part has all data`);
  }

  // No cuts
  {
    const { parts, actualCutTimes } = splitMp3(data, []);
    assert(parts.length === 1, `no cuts: 1 part`);
    assert(actualCutTimes.length === 0, `no cuts: no actual cut times`);
  }
}

// ---------------------------------------------------------------------------
// Test 4: MarkerStripper → cut times → split (integration)
// ---------------------------------------------------------------------------
async function testMarkerToCutTimes() {
  console.log(c.bold("\n=== Test 4: MarkerStripper → Cut Times (integration) ===\n"));

  const text = `[DONG]
[SILENT 3s]
Prima frase della meditazione, rilassati e respira.
[SILENT 5s]
Seconda frase, lascia andare ogni tensione.
[DONG]
[SILENT 3s]
[DONG]`;

  const { cleanText, markers } = stripMarkersWithPositions(text);

  console.log(c.dim(`  Clean text: "${cleanText}"`));
  console.log(c.dim(`  Markers: ${markers.length}`));

  // Leading markers should have charIndex 0
  assert(markers[0].type === "dong" && markers[0].charIndex === 0, "leading DONG: charIndex=0");
  assert(markers[1].type === "silence" && markers[1].charIndex === 0, "leading SILENT 3s: charIndex=0");

  // Middle marker
  const firstSentence = "Prima frase della meditazione, rilassati e respira.";
  assert(markers[2].type === "silence" && markers[2].charIndex === firstSentence.length,
    `middle SILENT 5s: charIndex=${firstSentence.length}`);

  // Simulate alignment (fake, evenly distributed)
  const fakeCharsPerSecond = 10;
  const fakeTotalDuration = cleanText.length / fakeCharsPerSecond;
  const fakeAlignmentEnds = Array.from({ length: cleanText.length }, (_, i) => (i + 1) / fakeCharsPerSecond);

  // Compute cut times (same logic as GenerateMeditationUseCase)
  const cutTimes: number[] = [];
  for (const marker of markers) {
    let cutTime: number;
    if (marker.charIndex <= 0) {
      cutTime = 0;
    } else if (marker.charIndex >= cleanText.length) {
      cutTime = fakeTotalDuration;
    } else {
      const alignIdx = Math.min(marker.charIndex - 1, fakeAlignmentEnds.length - 1);
      cutTime = fakeAlignmentEnds[alignIdx];
    }
    cutTimes.push(cutTime);
  }

  console.log(c.dim(`  Cut times: [${cutTimes.map(t => t.toFixed(2)).join(", ")}]`));

  // Leading markers → cutTime = 0
  assert(cutTimes[0] === 0, "leading DONG cut at 0");
  assert(cutTimes[1] === 0, "leading SILENT cut at 0");

  // Middle marker → cut at correct position
  const expectedMiddleCut = fakeAlignmentEnds[firstSentence.length - 1];
  assertClose(cutTimes[2], expectedMiddleCut, 0.001, `middle SILENT cut at ${expectedMiddleCut.toFixed(2)}s`);

  // Trailing markers → cut at end
  const lastCut = cutTimes[cutTimes.length - 1];
  assertClose(lastCut, fakeTotalDuration, 0.001, `trailing marker cuts at ${fakeTotalDuration.toFixed(2)}s`);

  // Simulate interleaving (parts + markers) — same logic as GenerateMeditationUseCase
  // With N cuts sorted, a part is empty when its start cut == end cut
  const sortedCuts = [...cutTimes].sort((a, b) => a - b);
  const partCount = sortedCuts.length + 1;
  let assemblyOrder: string[] = [];
  for (let i = 0; i < partCount; i++) {
    const partStart = i === 0 ? 0 : sortedCuts[i - 1];
    const partEnd = i < sortedCuts.length ? sortedCuts[i] : fakeTotalDuration;
    const isEmpty = partEnd <= partStart;
    if (!isEmpty) assemblyOrder.push(`speech_part_${i}`);
    if (i < markers.length) {
      assemblyOrder.push(`${markers[i].type}${markers[i].seconds ? `_${markers[i].seconds}s` : ""}`);
    }
  }

  console.log(c.dim(`  Assembly order: [${assemblyOrder.join(", ")}]`));
  assert(assemblyOrder[0] === "dong", "first in assembly is dong");
  assert(assemblyOrder[1] === "silence_3s", "then silence after leading dong");
  assert(assemblyOrder.includes("speech_part_2"), "has speech after leading markers");
}

// ---------------------------------------------------------------------------
// Test 5: Live ElevenLabs API + full flow (only with --live flag)
// ---------------------------------------------------------------------------
async function testLiveElevenLabsFlow() {
  console.log(c.bold("\n=== Test 5: LIVE ElevenLabs Full Audio + Split ===\n"));

  const elApiKey = process.env.ELEVENLABS_API_KEY;
  if (!elApiKey) {
    console.log(c.yellow("  SKIP: ELEVENLABS_API_KEY not set"));
    return;
  }

  const outputDir = path.resolve(__dirname, "output", "mobile-flow-test");
  fs.mkdirSync(outputDir, { recursive: true });

  const meditationText = customText || `[DONG]
[SILENT 3s]
Close your eyes gently and take a deep breath in.
[SILENT 5s]
Now exhale slowly, letting go of any tension you might be holding.
[SILENT 3s]
Feel the weight of your body against whatever surface supports you.
[DONG]
[SILENT 3s]
[DONG]`;

  // 1. Strip markers
  const { cleanText, markers } = stripMarkersWithPositions(meditationText);
  console.log(c.dim(`  Clean text (${cleanText.length} chars): "${cleanText.substring(0, 80)}..."`));
  console.log(c.dim(`  Markers: ${markers.length}`));

  // 2. Call ElevenLabs with-timestamps API (same as ElevenLabsTTSAdapter.callWithTimestamps)
  const voiceId = "KoVIHoyLDrQyd4pGalbs"; // autumn-veil
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`;

  console.log(c.dim("  Calling ElevenLabs /with-timestamps..."));
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": elApiKey,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      text: cleanText,
      model_id: "eleven_flash_v2_5",
      voice_settings: {
        stability: 0.65,
        similarity_boost: 0.9,
        style: 0.4,
        use_speaker_boost: true,
        speed: 0.7,
      },
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.log(c.red(`  API error ${response.status}: ${errBody}`));
    failed++;
    return;
  }

  const data = await response.json() as {
    audio_base64: string;
    alignment?: {
      characters: string[];
      character_start_times_seconds: number[];
      character_end_times_seconds: number[];
    };
  };

  // Decode base64 (same as ElevenLabsTTSAdapter: atob + charCodeAt)
  const binaryStr = Buffer.from(data.audio_base64, "base64").toString("binary");
  const audioData = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    audioData[i] = binaryStr.charCodeAt(i);
  }

  const alignment = data.alignment!;
  const alignEnds = alignment.character_end_times_seconds;
  const alignmentDuration = alignEnds[alignEnds.length - 1];

  // Real audio duration from frame scanning (alignment underestimates due to trailing padding)
  const strippedSpeech = stripMp3Metadata(audioData);
  const totalDuration = calculateMp3Duration(strippedSpeech);

  console.log(c.dim(`  Audio: ${(audioData.length / 1024).toFixed(0)} KB, alignment: ${alignmentDuration.toFixed(2)}s, real duration: ${totalDuration.toFixed(2)}s`));
  console.log(c.dim(`  Alignment chars: ${alignment.characters.length}`));

  assert(audioData.length > 0, "received audio data");
  assert(alignment.characters.length > 0, "received alignment data");
  assert(alignment.characters.length === alignEnds.length, "alignment arrays same length");

  // --- Alignment integrity checks ---
  // Verify that ElevenLabs returned exactly one alignment entry per cleanText character.
  // For single-chunk requests this should always hold. For multi-chunk (text > 4000 chars),
  // the adapter's merging logic must preserve the invariant.
  assert(alignment.characters.length === cleanText.length,
    `alignment chars count === cleanText length (${alignment.characters.length} vs ${cleanText.length})`);

  const alignmentJoined = alignment.characters.join('');
  let charMismatches = 0;
  let firstMismatchInfo = '';
  for (let i = 0; i < Math.min(alignment.characters.length, cleanText.length); i++) {
    if (alignment.characters[i] !== cleanText[i]) {
      charMismatches++;
      if (charMismatches === 1) {
        firstMismatchInfo = `index ${i}: expected '${cleanText[i]}' (code ${cleanText.charCodeAt(i)}) got '${alignment.characters[i]}' (code ${alignment.characters[i].charCodeAt(0)})`;
      }
    }
  }
  if (charMismatches > 0) {
    console.log(c.yellow(`  Alignment text mismatches: ${charMismatches} chars`));
    console.log(c.yellow(`    First mismatch: ${firstMismatchInfo}`));
  }
  assert(charMismatches === 0, `alignment chars match cleanText char-by-char (mismatches: ${charMismatches})`);

  // Verify marker alignment: at each marker's charIndex, the alignment character must match
  for (const marker of markers) {
    if (marker.charIndex <= 0 || marker.charIndex >= cleanText.length) continue;
    const idx = marker.charIndex - 1;
    if (idx < alignment.characters.length) {
      assert(alignment.characters[idx] === cleanText[idx],
        `marker ${marker.type} @ ${marker.charIndex}: alignment[${idx}]='${alignment.characters[idx]}' === cleanText[${idx}]='${cleanText[idx]}'`);
    }
  }

  // Save full speech for reference
  fs.writeFileSync(path.join(outputDir, "full_speech.mp3"), audioData);

  // 3. Compute cut times (same as GenerateMeditationUseCase)
  const cutTimes: number[] = [];
  for (const marker of markers) {
    let cutTime: number;
    if (marker.charIndex <= 0) {
      cutTime = 0;
    } else if (marker.charIndex >= cleanText.length) {
      cutTime = totalDuration;
    } else {
      const alignIdx = Math.min(marker.charIndex - 1, alignEnds.length - 1);
      cutTime = alignEnds[alignIdx];
    }
    cutTimes.push(cutTime);
  }

  console.log(c.dim(`  Cut times: [${cutTimes.map(t => t.toFixed(3) + "s").join(", ")}]`));

  // 4. Split MP3 at frame boundaries (same algorithm as Mp3FrameSplitter.split)
  const { parts, actualCutTimes } = splitMp3(audioData, cutTimes);

  console.log(c.dim(`  Split into ${parts.length} parts:`));
  for (let i = 0; i < parts.length; i++) {
    const isEmpty = parts[i].length === 0;
    console.log(c.dim(`    part[${i}]: ${isEmpty ? "(empty)" : `${parts[i].length} bytes`}`));
  }

  assert(parts.length === cutTimes.length + 1, `N+1 parts for N cuts (${parts.length} == ${cutTimes.length + 1})`);

  // Verify lossless: reassembled should match stripped original
  const strippedOriginal = stripMetadata(audioData);
  const reassembled = concatenateBuffers(parts);
  assert(reassembled.length === strippedOriginal.length,
    `reassembled length matches (${reassembled.length} == ${strippedOriginal.length})`);

  let mismatches = 0;
  for (let i = 0; i < reassembled.length; i++) {
    if (reassembled[i] !== strippedOriginal[i]) mismatches++;
  }
  assert(mismatches === 0, `byte-for-byte identical after split+reassemble (mismatches: ${mismatches})`);

  // 5. Build final file: interleave speech + silence/dong
  const dongPath = path.resolve(__dirname, "../assets/sounds/dong-44k.mp3");
  const silencePath = path.resolve(__dirname, "../assets/sounds/silence-44k.mp3");
  const hasDong = fs.existsSync(dongPath);
  const hasSilence = fs.existsSync(silencePath);

  const dongBytes = hasDong ? stripMetadata(new Uint8Array(fs.readFileSync(dongPath))) : null;
  const silenceBytes = hasSilence ? stripMetadata(new Uint8Array(fs.readFileSync(silencePath))) : null;

  const orderedBuffers: Uint8Array[] = [];
  const assemblyLog: string[] = [];

  for (let i = 0; i < parts.length; i++) {
    // Speech part
    if (parts[i].length > 0) {
      orderedBuffers.push(parts[i]);
      assemblyLog.push(`speech[${i}] (${parts[i].length} bytes)`);
    }

    // Marker after this part
    if (i < markers.length) {
      const marker = markers[i];
      if (marker.type === "silence" && marker.seconds && silenceBytes) {
        const repeatCount = Math.max(1, Math.round(marker.seconds));
        const silBuf = new Uint8Array(silenceBytes.length * repeatCount);
        for (let r = 0; r < repeatCount; r++) {
          silBuf.set(silenceBytes, r * silenceBytes.length);
        }
        orderedBuffers.push(silBuf);
        assemblyLog.push(`silence ${marker.seconds}s`);
      } else if (marker.type === "dong" && dongBytes) {
        orderedBuffers.push(dongBytes);
        assemblyLog.push("dong");
      }
    }
  }

  console.log(c.dim(`\n  Assembly order (${assemblyLog.length} segments):`));
  for (let i = 0; i < assemblyLog.length; i++) {
    console.log(c.dim(`    ${i + 1}. ${assemblyLog[i]}`));
  }

  // 6. Concatenate and save final MP3
  const finalBuffer = concatenateBuffers(orderedBuffers);
  const finalPath = path.join(outputDir, "final_meditation.mp3");
  fs.writeFileSync(finalPath, finalBuffer);

  // Count frames in final file to get total duration
  let finalPos = 0;
  let finalDuration = 0;
  while (finalPos < finalBuffer.length) {
    const info = parseFrameHeader(finalBuffer, finalPos);
    if (!info) { finalPos++; continue; }
    finalDuration += info.duration;
    finalPos += info.size;
  }

  console.log(c.dim(`\n  Final file: ${(finalBuffer.length / 1024).toFixed(0)} KB, ~${finalDuration.toFixed(1)}s`));

  // Estimate expected duration using REAL audio durations (not nominal seconds)
  const silenceDurEach = silenceBytes ? calculateMp3Duration(silenceBytes) : 1.0;
  let expectedSilenceDur = 0;
  let expectedDongs = 0;
  for (const m of markers) {
    if (m.type === "silence" && m.seconds) {
      const repeatCount = Math.max(1, Math.round(m.seconds));
      expectedSilenceDur += repeatCount * silenceDurEach;
    }
    if (m.type === "dong") expectedDongs++;
  }
  const dongDurEach = dongBytes ? calculateMp3Duration(dongBytes) : 0;
  const expectedTotal = totalDuration + expectedSilenceDur + expectedDongs * dongDurEach;
  console.log(c.dim(`  Expected: speech(${totalDuration.toFixed(1)}s) + silence(${expectedSilenceDur.toFixed(1)}s) + dong(${expectedDongs}x${dongDurEach.toFixed(1)}s) = ~${expectedTotal.toFixed(1)}s`));

  assertClose(finalDuration, expectedTotal, 1.0, `final duration within 1s of expected`);

  assert(finalBuffer.length > audioData.length, "final is larger than speech-only (has silence/dong)");

  console.log(c.green(`\n  Output saved to: ${outputDir}/`));
  console.log(c.dim(`    - full_speech.mp3     (speech only, for reference)`));
  console.log(c.dim(`    - final_meditation.mp3 (complete with dong + silence)`));
}

// ---------------------------------------------------------------------------
// Test 6: Multi-chunk round-trip (simulates ElevenLabs chunking)
// ---------------------------------------------------------------------------
async function testMultiChunkRoundTrip() {
  console.log(c.bold("\n=== Test 6: Multi-chunk Round-trip (stripMp3Metadata + calculateMp3Duration) ===\n"));

  const dongPath = path.resolve(__dirname, "../assets/sounds/dong-44k.mp3");
  if (!fs.existsSync(dongPath)) {
    console.log(c.yellow("  SKIP: dong-44k.mp3 not found"));
    return;
  }

  const originalRaw = new Uint8Array(fs.readFileSync(dongPath));

  // Simulate 2 "chunks" from ElevenLabs — each has full ID3v2/Xing metadata
  const chunk1 = originalRaw.slice(); // full copy with metadata
  const chunk2 = originalRaw.slice(); // full copy with metadata

  // Verify chunks have metadata (ID3v2 tag)
  const chunk1Id3Size = skipId3v2(chunk1);
  assert(chunk1Id3Size > 0, `chunk 1 has ID3v2 tag (${chunk1Id3Size} bytes)`);

  // Strip metadata from each chunk (same as the fixed ElevenLabsTTSAdapter does)
  const stripped1 = stripMp3Metadata(chunk1);
  const stripped2 = stripMp3Metadata(chunk2);

  assert(stripped1.length < chunk1.length, `stripMp3Metadata reduces size (${stripped1.length} < ${chunk1.length})`);
  assert(stripped2.length < chunk2.length, `stripMp3Metadata reduces size for chunk 2`);

  // Verify stripped data starts with a valid frame sync
  assert(isFrameSync(stripped1, 0), "stripped chunk 1 starts with frame sync");
  assert(isFrameSync(stripped2, 0), "stripped chunk 2 starts with frame sync");

  // Verify no ID3v2 tag in stripped data
  assert(skipId3v2(stripped1) === 0, "stripped chunk 1 has no ID3v2 tag");
  assert(skipId3v2(stripped2) === 0, "stripped chunk 2 has no ID3v2 tag");

  // Concatenate stripped chunks (same as the fixed generateFullAudioWithTimestamps)
  const combined = concatenateBuffers([stripped1, stripped2]);

  // Verify combined starts with frame sync (no metadata in the middle)
  assert(isFrameSync(combined, 0), "combined audio starts with frame sync");

  // Scan combined for corrupt frames / metadata in the middle
  let pos = 0;
  let frameCount = 0;
  let gapBytes = 0;
  while (pos < combined.length) {
    const info = parseFrameHeader(combined, pos);
    if (!info || info.size <= 0) {
      gapBytes++;
      pos++;
      continue;
    }
    frameCount++;
    pos += info.size;
  }

  console.log(c.dim(`  Combined: ${combined.length} bytes, ${frameCount} frames, ${gapBytes} gap bytes`));
  assert(gapBytes === 0, `no gap bytes in combined audio (got ${gapBytes})`);
  assert(frameCount > 0, `combined has valid frames (${frameCount})`);

  // Calculate duration with the new utility
  const duration1 = calculateMp3Duration(stripped1);
  const duration2 = calculateMp3Duration(stripped2);
  const combinedDuration = calculateMp3Duration(combined);

  console.log(c.dim(`  Chunk 1 duration: ${duration1.toFixed(3)}s`));
  console.log(c.dim(`  Chunk 2 duration: ${duration2.toFixed(3)}s`));
  console.log(c.dim(`  Combined duration: ${combinedDuration.toFixed(3)}s`));

  assert(duration1 > 0, `chunk 1 has positive duration`);
  assert(duration2 > 0, `chunk 2 has positive duration`);
  assertClose(combinedDuration, duration1 + duration2, 0.001, `combined duration == sum of chunks`);

  // Compare with the old local stripMetadata function for consistency
  const localStripped = stripMetadata(originalRaw);
  assert(stripped1.length === localStripped.length, `stripMp3Metadata matches local stripMetadata (${stripped1.length} == ${localStripped.length})`);

  let mismatchCount = 0;
  for (let i = 0; i < stripped1.length; i++) {
    if (stripped1[i] !== localStripped[i]) mismatchCount++;
  }
  assert(mismatchCount === 0, `stripMp3Metadata output byte-for-byte identical to local impl`);

  // Simulate what the OLD (buggy) code did: concatenate WITH metadata
  const buggyConcat = concatenateBuffers([chunk1, chunk2]);
  let buggyGaps = 0;
  let buggyPos = 0;
  while (buggyPos < buggyConcat.length) {
    const info = parseFrameHeader(buggyConcat, buggyPos);
    if (!info || info.size <= 0) {
      buggyGaps++;
      buggyPos++;
      continue;
    }
    buggyPos += info.size;
  }
  assert(buggyGaps > 0, `buggy (non-stripped) concat has gap bytes (${buggyGaps}) — proves the fix is needed`);
}

// ---------------------------------------------------------------------------
// Test 7: Multi-chunk Alignment Invariant (trim() bug detector)
// ---------------------------------------------------------------------------
async function testMultiChunkAlignmentInvariant() {
  console.log(c.bold("\n=== Test 7: Multi-chunk Alignment Invariant (trim() bug detector) ===\n"));

  const MAX_CHUNK = 4000; // Same as ElevenLabsTTSAdapter MAX_CHUNK_LENGTH

  // --- Build meditation text > 4000 chars with markers ---
  // We place [SILENT 5s] AFTER the expected first chunk boundary (~3500 chars)
  // so its charIndex falls in the second chunk's character range.
  // This means if the chunking loses characters (trim bug), the marker's
  // charIndex will point to the WRONG character in the merged alignment.
  const totalSentences = 60;
  const markerAfterSentence = 48; // ~48*85 ≈ 4080 chars — well after chunk boundary

  let rawText = "[DONG]\n[SILENT 3s]\n";
  for (let i = 1; i <= totalSentences; i++) {
    rawText += `Sentence number ${i}, take a deep breath and feel the peace flowing through your body now. `;
    if (i === markerAfterSentence) {
      rawText += "\n[SILENT 5s]\n";
    }
  }
  rawText += "\n[DONG]";

  // Strip markers
  const { cleanText, markers } = stripMarkersWithPositions(rawText);

  console.log(c.dim(`  Clean text length: ${cleanText.length} chars`));
  console.log(c.dim(`  Markers: ${markers.map(m => `${m.type}@${m.charIndex}`).join(', ')}`));
  assert(cleanText.length > MAX_CHUNK,
    `cleanText > ${MAX_CHUNK} (got ${cleanText.length})`);

  // --- Replicate chunking from ElevenLabsTTSAdapter.generateFullAudioWithTimestamps ---
  // This MUST match the adapter's logic exactly.
  // After the trim() fix, NO .trim() is applied to chunks.
  const regexMatches = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];
  const chunks: string[] = [];
  let current = '';

  for (const sentence of regexMatches) {
    if ((current + sentence).length > MAX_CHUNK - 500) {
      if (current) chunks.push(current);  // No .trim() — the fix
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current) chunks.push(current);  // No .trim() — the fix

  console.log(c.dim(`  Regex matches: ${regexMatches.length} sentences`));
  console.log(c.dim(`  Chunks: ${chunks.length}, lengths: [${chunks.map(ch => ch.length).join(', ')}]`));

  // --- INVARIANT 1: chunks.join('') must reconstruct cleanText exactly ---
  const joined = chunks.join('');
  assert(joined.length === cleanText.length,
    `chunks.join('').length === cleanText.length (${joined.length} vs ${cleanText.length})`);
  assert(joined === cleanText,
    `chunks.join('') === cleanText (char-for-char match)`);

  // --- Simulate per-character alignment (merging across chunks) ---
  // Same as ElevenLabsTTSAdapter: for each chunk, ElevenLabs returns per-char alignment.
  // We merge them sequentially. If chunks.join('') !== cleanText, the merged alignment
  // will have FEWER characters, causing all charIndex lookups after the boundary to be wrong.
  const allChars: string[] = [];
  const fakeCharDuration = 0.05; // 50ms per char
  const allEnds: number[] = [];
  let timeOffset = 0;

  for (const chunk of chunks) {
    for (let j = 0; j < chunk.length; j++) {
      allChars.push(chunk[j]);
      allEnds.push(timeOffset + (j + 1) * fakeCharDuration);
    }
    timeOffset += chunk.length * fakeCharDuration;
  }

  assert(allChars.length === cleanText.length,
    `merged alignment length === cleanText.length (${allChars.length} vs ${cleanText.length})`);

  // --- INVARIANT 2: at each marker's charIndex, alignment char must match cleanText ---
  let markerAlignmentOk = true;
  for (const marker of markers) {
    if (marker.charIndex <= 0 || marker.charIndex >= cleanText.length) continue;
    const alignIdx = marker.charIndex - 1;
    if (alignIdx >= allChars.length) {
      console.log(c.red(`    marker ${marker.type} @ charIndex=${marker.charIndex}: alignIdx ${alignIdx} OUT OF BOUNDS (allChars.length=${allChars.length})`));
      markerAlignmentOk = false;
      continue;
    }
    const expected = cleanText[alignIdx];
    const actual = allChars[alignIdx];
    if (actual !== expected) {
      console.log(c.red(`    marker ${marker.type} @ charIndex=${marker.charIndex}: expected '${expected}' got '${actual}'`));
      markerAlignmentOk = false;
    } else {
      console.log(c.dim(`    marker ${marker.type} @ charIndex=${marker.charIndex}: OK (char='${actual}')`));
    }
  }
  assert(markerAlignmentOk, `all non-leading markers: alignment char matches cleanText char`);

  // --- Diagnostics: show exact divergence point if invariant 1 failed ---
  if (joined !== cleanText) {
    for (let i = 0; i < Math.max(joined.length, cleanText.length); i++) {
      if (joined[i] !== cleanText[i]) {
        const ctx = 20;
        console.log(c.red(`\n  DIVERGENCE at index ${i}:`));
        console.log(c.red(`    cleanText[${i}] = '${cleanText[i] ?? 'EOF'}' (code ${cleanText[i] ? cleanText.charCodeAt(i) : '-'})`));
        console.log(c.red(`    joined[${i}]    = '${joined[i] ?? 'EOF'}' (code ${joined[i] ? joined.charCodeAt(i) : '-'})`));
        console.log(c.dim(`    cleanText context: ...${JSON.stringify(cleanText.slice(Math.max(0, i - ctx), i + ctx))}...`));
        console.log(c.dim(`    joined context:    ...${JSON.stringify(joined.slice(Math.max(0, i - ctx), i + ctx))}...`));
        console.log(c.dim(`    Characters lost: ${cleanText.length - joined.length}`));
        break;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(c.bold("\n========================================"));
  console.log(c.bold("  Mobile Flow Test Suite"));
  console.log(c.bold("  (Tests the same pure-JS logic as the Expo app)"));
  console.log(c.bold("========================================"));

  await testMp3FrameUtils();
  await testSplitReassemble();
  await testSplitEdgeCases();
  await testMarkerToCutTimes();
  await testMultiChunkRoundTrip();
  await testMultiChunkAlignmentInvariant();

  if (isLive) {
    await testLiveElevenLabsFlow();
  } else {
    console.log(c.bold("\n=== Test 5: LIVE ElevenLabs (skipped) ==="));
    console.log(c.dim("  Run with --live to test against the real API\n"));
  }

  // Summary
  console.log(c.bold("\n========================================"));
  console.log(`  Results: ${c.green(`${passed} passed`)}, ${failed > 0 ? c.red(`${failed} failed`) : `${failed} failed`}`);
  console.log(c.bold("========================================\n"));

  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error(c.red(`\nFatal: ${err.message}`));
  if (err.stack) console.error(c.dim(err.stack));
  process.exit(1);
});
