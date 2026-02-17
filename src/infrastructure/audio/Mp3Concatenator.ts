import { File } from 'expo-file-system';

export class Mp3Concatenator {
  /**
   * Concatenate MP3 files into a single output file.
   * Strips ID3 tags and Xing/Info headers from each segment so the
   * resulting file reports the correct total duration.
   */
  static async concatenate(inputPaths: string[], outputPath: string): Promise<void> {
    const buffers: Uint8Array[] = [];
    let totalLength = 0;

    for (const path of inputPaths) {
      const file = new File(path);
      const raw = await file.bytes();
      const stripped = Mp3Concatenator.stripMetadata(raw);
      buffers.push(stripped);
      totalLength += stripped.length;
    }

    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const buf of buffers) {
      combined.set(buf, offset);
      offset += buf.length;
    }

    const outputFile = new File(outputPath);
    outputFile.write(combined);
  }

  /**
   * Strip ID3v2 tag, Xing/Info VBR header frame, and ID3v1 tag
   * from MP3 data, returning only raw audio frames.
   */
  private static stripMetadata(data: Uint8Array): Uint8Array {
    let start = 0;
    let end = data.length;

    // 1. Skip ID3v2 tag if present (starts with "ID3")
    if (data.length > 10 && data[0] === 0x49 && data[1] === 0x44 && data[2] === 0x33) {
      const tagSize =
        ((data[6] & 0x7f) << 21) |
        ((data[7] & 0x7f) << 14) |
        ((data[8] & 0x7f) << 7) |
        (data[9] & 0x7f);
      start = 10 + tagSize;
    }

    // 2. Skip ID3v1 tag at end (last 128 bytes starting with "TAG")
    if (end - start > 128) {
      const t = end - 128;
      if (data[t] === 0x54 && data[t + 1] === 0x41 && data[t + 2] === 0x47) {
        end = t;
      }
    }

    // 3. Check if the first MP3 frame is a Xing/Info frame and skip it
    if (start < end - 4 && data[start] === 0xff && (data[start + 1] & 0xe0) === 0xe0) {
      const frameSize = Mp3Concatenator.getFrameSize(data, start);
      if (frameSize > 0) {
        const searchEnd = Math.min(start + frameSize, end);
        for (let i = start + 4; i < searchEnd - 3; i++) {
          // Look for "Xing" or "Info" ASCII string
          if (
            (data[i] === 0x58 && data[i + 1] === 0x69 && data[i + 2] === 0x6e && data[i + 3] === 0x67) ||
            (data[i] === 0x49 && data[i + 1] === 0x6e && data[i + 2] === 0x66 && data[i + 3] === 0x6f)
          ) {
            start += frameSize;
            break;
          }
        }
      }
    }

    return data.subarray(start, end);
  }

  /**
   * Calculate the size in bytes of an MP3 frame starting at `offset`.
   * Returns 0 if the header is invalid.
   */
  private static getFrameSize(data: Uint8Array, offset: number): number {
    if (offset + 4 > data.length) return 0;
    if (data[offset] !== 0xff || (data[offset + 1] & 0xe0) !== 0xe0) return 0;

    const header =
      (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];

    const versionBits = (header >> 19) & 3;
    const bitrateIndex = (header >> 12) & 0xf;
    const sampleRateIndex = (header >> 10) & 3;
    const padding = (header >> 9) & 1;

    if (bitrateIndex === 0 || bitrateIndex === 0xf) return 0;
    if (sampleRateIndex === 3) return 0;

    // Bitrate tables (kbps) — Layer III
    const bitratesV1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
    const bitratesV2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0];

    const srV1 = [44100, 48000, 32000];
    const srV2 = [22050, 24000, 16000];
    const srV25 = [11025, 12000, 8000];

    if (versionBits === 3) {
      // MPEG1
      const bitrate = bitratesV1[bitrateIndex] * 1000;
      const sampleRate = srV1[sampleRateIndex];
      return Math.floor((144 * bitrate) / sampleRate) + padding;
    } else if (versionBits === 2) {
      // MPEG2
      const bitrate = bitratesV2[bitrateIndex] * 1000;
      const sampleRate = srV2[sampleRateIndex];
      return Math.floor((72 * bitrate) / sampleRate) + padding;
    } else if (versionBits === 0) {
      // MPEG2.5
      const bitrate = bitratesV2[bitrateIndex] * 1000;
      const sampleRate = srV25[sampleRateIndex];
      return Math.floor((72 * bitrate) / sampleRate) + padding;
    }

    return 0;
  }
}
