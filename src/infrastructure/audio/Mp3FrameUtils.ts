export interface Mp3FrameInfo {
  size: number;
  sampleRate: number;
  samplesPerFrame: number; // 1152 MPEG1, 576 MPEG2/2.5
  duration: number; // seconds per frame
}

// Bitrate tables (kbps) — Layer III
const BITRATES_V1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
const BITRATES_V2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0];

const SR_V1 = [44100, 48000, 32000];
const SR_V2 = [22050, 24000, 16000];
const SR_V25 = [11025, 12000, 8000];

export function isFrameSync(data: Uint8Array, offset: number): boolean {
  if (offset + 1 >= data.length) return false;
  return data[offset] === 0xff && (data[offset + 1] & 0xe0) === 0xe0;
}

export function parseFrameHeader(data: Uint8Array, offset: number): Mp3FrameInfo | null {
  if (offset + 4 > data.length) return null;
  if (!isFrameSync(data, offset)) return null;

  const header =
    (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];

  const versionBits = (header >> 19) & 3;
  const bitrateIndex = (header >> 12) & 0xf;
  const sampleRateIndex = (header >> 10) & 3;
  const padding = (header >> 9) & 1;

  if (bitrateIndex === 0 || bitrateIndex === 0xf) return null;
  if (sampleRateIndex === 3) return null;

  let bitrate: number;
  let sampleRate: number;
  let samplesPerFrame: number;
  let size: number;

  if (versionBits === 3) {
    // MPEG1
    bitrate = BITRATES_V1[bitrateIndex] * 1000;
    sampleRate = SR_V1[sampleRateIndex];
    samplesPerFrame = 1152;
    size = Math.floor((144 * bitrate) / sampleRate) + padding;
  } else if (versionBits === 2) {
    // MPEG2
    bitrate = BITRATES_V2[bitrateIndex] * 1000;
    sampleRate = SR_V2[sampleRateIndex];
    samplesPerFrame = 576;
    size = Math.floor((72 * bitrate) / sampleRate) + padding;
  } else if (versionBits === 0) {
    // MPEG2.5
    bitrate = BITRATES_V2[bitrateIndex] * 1000;
    sampleRate = SR_V25[sampleRateIndex];
    samplesPerFrame = 576;
    size = Math.floor((72 * bitrate) / sampleRate) + padding;
  } else {
    return null;
  }

  if (size <= 0) return null;

  return {
    size,
    sampleRate,
    samplesPerFrame,
    duration: samplesPerFrame / sampleRate,
  };
}

export function getFrameSize(data: Uint8Array, offset: number): number {
  const info = parseFrameHeader(data, offset);
  return info ? info.size : 0;
}

export function skipId3v2(data: Uint8Array): number {
  if (data.length > 10 && data[0] === 0x49 && data[1] === 0x44 && data[2] === 0x33) {
    const tagSize =
      ((data[6] & 0x7f) << 21) |
      ((data[7] & 0x7f) << 14) |
      ((data[8] & 0x7f) << 7) |
      (data[9] & 0x7f);
    return 10 + tagSize;
  }
  return 0;
}

export function findDataEnd(data: Uint8Array): number {
  let end = data.length;
  // Skip ID3v1 tag at end (last 128 bytes starting with "TAG")
  if (end > 128) {
    const t = end - 128;
    if (data[t] === 0x54 && data[t + 1] === 0x41 && data[t + 2] === 0x47) {
      end = t;
    }
  }
  return end;
}

export function isXingFrame(data: Uint8Array, offset: number, frameSize: number, end: number): boolean {
  const searchEnd = Math.min(offset + frameSize, end);
  for (let i = offset + 4; i < searchEnd - 3; i++) {
    if (
      (data[i] === 0x58 && data[i + 1] === 0x69 && data[i + 2] === 0x6e && data[i + 3] === 0x67) ||
      (data[i] === 0x49 && data[i + 1] === 0x6e && data[i + 2] === 0x66 && data[i + 3] === 0x6f)
    ) {
      return true;
    }
  }
  return false;
}

/** Strip ID3v2, ID3v1, Xing/Info frame → only raw audio frames */
export function stripMp3Metadata(data: Uint8Array): Uint8Array {
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

/** Calculate total MP3 duration in seconds by scanning all frames */
export function calculateMp3Duration(data: Uint8Array): number {
  let duration = 0;
  let pos = 0;

  while (pos < data.length) {
    const info = parseFrameHeader(data, pos);
    if (!info || info.size <= 0) {
      pos++;
      continue;
    }
    duration += info.duration;
    pos += info.size;
  }

  return duration;
}
