import { File, Directory, Paths } from 'expo-file-system';
import { parseFrameHeader, skipId3v2, findDataEnd, isFrameSync, getFrameSize, isXingFrame } from './Mp3FrameUtils';

/** Seconds to shift the cut point. Positive = forward (into next segment), negative = backward. 0 = no shift. */
const CUT_PAD_SECONDS = 0;

/** Rounding direction when snapping to frame boundaries: 'floor' or 'ceil'. */
const CUT_ROUNDING: 'floor' | 'ceil' = 'floor';

export interface SplitResult {
  parts: Uint8Array[];
  actualCutTimes: number[];
}

export interface SplitAndSaveResult {
  partPaths: string[];
  actualCutTimes: number[];
}

export class Mp3FrameSplitter {
  /**
   * Split MP3 audio data at the given cut times (in seconds).
   * Returns N+1 parts for N cuts, snapped to MP3 frame boundaries.
   * Parts may be empty (zero-length Uint8Array) if cuts are at the start.
   */
  static split(audioData: Uint8Array, cutTimes: number[]): SplitResult {
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

    // 2. Scan all frames and build cumulative time array
    const frameOffsets: number[] = [];
    const frameCumulativeTimes: number[] = [];
    let cumulativeTime = 0;
    let pos = start;

    while (pos < end) {
      const info = parseFrameHeader(audioData, pos);
      if (!info || info.size <= 0) {
        // Try to find next sync
        pos++;
        while (pos < end - 1 && !isFrameSync(audioData, pos)) pos++;
        continue;
      }

      frameOffsets.push(pos);
      frameCumulativeTimes.push(cumulativeTime);
      cumulativeTime += info.duration;
      pos += info.size;
    }

    // Add sentinel for total duration/end offset
    frameOffsets.push(pos);
    frameCumulativeTimes.push(cumulativeTime);

    if (cutTimes.length === 0) {
      return {
        parts: [audioData.subarray(start, end)],
        actualCutTimes: [],
      };
    }

    // 3. For each cut time, find the nearest frame boundary via binary search
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
        // Preserves full beginning of next segment (no clipping).
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

    // 4. Build parts from frame boundaries
    const parts: Uint8Array[] = [];
    let prevFrameIdx = 0;

    for (const frameIdx of cutFrameIndices) {
      const startByte = frameOffsets[prevFrameIdx];
      const endByte = frameOffsets[frameIdx];
      if (endByte > startByte) {
        parts.push(audioData.subarray(startByte, endByte));
      } else {
        parts.push(new Uint8Array(0));
      }
      prevFrameIdx = frameIdx;
    }

    // Last part: from last cut to end
    const lastStart = frameOffsets[prevFrameIdx];
    const lastEnd = frameOffsets[frameOffsets.length - 1];
    if (lastEnd > lastStart) {
      parts.push(audioData.subarray(lastStart, lastEnd));
    } else {
      parts.push(new Uint8Array(0));
    }

    return { parts, actualCutTimes };
  }

  /**
   * Split and save each non-empty part as a temp MP3 file.
   * Returns paths (empty string for empty parts).
   */
  static async splitAndSave(audioData: Uint8Array, cutTimes: number[]): Promise<SplitAndSaveResult> {
    const { parts, actualCutTimes } = Mp3FrameSplitter.split(audioData, cutTimes);

    const segmentsDir = new Directory(Paths.cache, 'segments');
    if (!segmentsDir.exists) {
      segmentsDir.create({ intermediates: true });
    }

    const partPaths: string[] = [];
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].length === 0) {
        partPaths.push('');
        continue;
      }
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}-part${i}.mp3`;
      const file = new File(segmentsDir, fileName);
      file.write(parts[i]);
      partPaths.push(file.uri);
    }

    return { partPaths, actualCutTimes };
  }
}
