import { File } from 'expo-file-system';
import { getFrameSize, skipId3v2, findDataEnd, isFrameSync, isXingFrame } from './Mp3FrameUtils';

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
    let start = skipId3v2(data);
    const end = findDataEnd(data);

    // Check if the first MP3 frame is a Xing/Info frame and skip it
    if (start < end - 4 && isFrameSync(data, start)) {
      const frameSize = getFrameSize(data, start);
      if (frameSize > 0 && isXingFrame(data, start, frameSize, end)) {
        start += frameSize;
      }
    }

    return data.subarray(start, end);
  }
}
