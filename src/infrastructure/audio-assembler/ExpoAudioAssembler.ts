import { AudioAssemblerPort, SaveSegmentsResult, SegmentManifestEntry } from '../../application/ports/AudioAssemblerPort';
import { MeditationSegment } from '../../domain/value-objects/MeditationSegment';
import { expandWithSentencePauses } from './SentencePauseProcessor';
import { File, Directory } from 'expo-file-system';
import { Asset } from 'expo-asset';
import { Mp3Concatenator } from '../audio/Mp3Concatenator';

const WORDS_PER_MINUTE = 120;
const DONG_DURATION_SECONDS = 2.5;

// 24kHz assets (for OpenAI TTS)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const dongAsset24k = require('../../../assets/sounds/dong-24k.mp3');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const silenceAsset24k = require('../../../assets/sounds/silence-24k.mp3');

// 44.1kHz assets (for ElevenLabs TTS)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const dongAsset44k = require('../../../assets/sounds/dong-44k.mp3');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const silenceAsset44k = require('../../../assets/sounds/silence-44k.mp3');

export class ExpoAudioAssembler implements AudioAssemblerPort {
  parseSegments(generatedText: string): MeditationSegment[] {
    const segments: MeditationSegment[] = [];
    const combinedRegex = /\[SILENT\s+(\d+)s?\]|\[DONG\]/gi;
    let lastIndex = 0;

    const matches = [...generatedText.matchAll(combinedRegex)];

    for (const match of matches) {
      const matchIndex = match.index!;

      // Extract speech text before this marker
      const speechText = generatedText.slice(lastIndex, matchIndex).trim();
      if (speechText.length > 0) {
        const wordCount = speechText.split(/\s+/).length;
        segments.push({
          type: 'speech',
          content: speechText,
          durationSeconds: (wordCount / WORDS_PER_MINUTE) * 60,
        });
      }

      if (match[0].toUpperCase().startsWith('[DONG')) {
        segments.push({
          type: 'dong',
          content: 'dong',
          durationSeconds: DONG_DURATION_SECONDS,
        });
      } else {
        const silenceDuration = parseInt(match[1], 10);
        segments.push({
          type: 'silence',
          content: match[1],
          durationSeconds: silenceDuration,
        });
      }

      lastIndex = matchIndex + match[0].length;
    }

    // Remaining text after last marker
    const remainingText = generatedText.slice(lastIndex).trim();
    if (remainingText.length > 0) {
      const wordCount = remainingText.split(/\s+/).length;
      segments.push({
        type: 'speech',
        content: remainingText,
        durationSeconds: (wordCount / WORDS_PER_MINUTE) * 60,
      });
    }

    // Fallback: if no segments were created, treat entire text as speech
    if (segments.length === 0) {
      const wordCount = generatedText.split(/\s+/).length;
      segments.push({
        type: 'speech',
        content: generatedText,
        durationSeconds: (wordCount / WORDS_PER_MINUTE) * 60,
      });
    }

    return segments;
  }

  expandWithPauses(segments: MeditationSegment[]): MeditationSegment[] {
    return expandWithSentencePauses(segments);
  }

  async saveSegments(
    segments: MeditationSegment[],
    meditationDirUri: string,
    ttsProvider?: string,
  ): Promise<SaveSegmentsResult> {
    const medDir = new Directory(meditationDirUri);
    if (!medDir.exists) {
      medDir.create({ intermediates: true });
    }

    // Select assets matching the TTS provider's sample rate
    const dongAsset = ttsProvider === 'elevenlabs' ? dongAsset44k : dongAsset24k;
    const silenceAsset = ttsProvider === 'elevenlabs' ? silenceAsset44k : silenceAsset24k;

    // Load silence asset bytes once
    const silenceBytes = await this.loadAssetBytes(silenceAsset);

    const manifest: SegmentManifestEntry[] = [];
    const segmentFilePaths: string[] = [];
    let segIndex = 0;
    let dongCopied = false;

    for (const segment of segments) {
      segIndex++;
      const paddedIndex = String(segIndex).padStart(3, '0');

      if (segment.type === 'speech' && segment.audioFilePath) {
        const fileName = `seg-${paddedIndex}.mp3`;
        const sourceFile = new File(segment.audioFilePath);
        const destFile = new File(medDir, fileName);
        sourceFile.move(destFile);
        manifest.push({
          type: 'speech',
          file: fileName,
          durationSeconds: segment.durationSeconds,
        });
        segmentFilePaths.push(destFile.uri);
      } else if (segment.type === 'dong') {
        if (!dongCopied) {
          const [asset] = await Asset.loadAsync(dongAsset);
          if (asset.localUri) {
            const assetFile = new File(asset.localUri);
            const destFile = new File(medDir, 'dong.mp3');
            assetFile.copy(destFile);
          }
          dongCopied = true;
        }
        manifest.push({
          type: 'dong',
          file: 'dong.mp3',
          durationSeconds: DONG_DURATION_SECONDS,
        });
        segmentFilePaths.push(new File(medDir, 'dong.mp3').uri);
      } else if (segment.type === 'silence') {
        const fileName = `seg-${paddedIndex}-silence.mp3`;
        this.generateSilenceFile(medDir, fileName, segment.durationSeconds, silenceBytes);
        manifest.push({
          type: 'silence',
          file: fileName,
          durationSeconds: segment.durationSeconds,
        });
        segmentFilePaths.push(new File(medDir, fileName).uri);
      }
    }

    // Concatenate all segment files into a single meditation.mp3
    const outputFile = new File(medDir, 'meditation.mp3');
    await Mp3Concatenator.concatenate(segmentFilePaths, outputFile.uri);

    return {
      manifest,
      audioFilePath: outputFile.uri,
    };
  }

  estimateDuration(segments: MeditationSegment[]): number {
    return segments.reduce((total, seg) => total + seg.durationSeconds, 0);
  }

  private generateSilenceFile(
    medDir: Directory,
    fileName: string,
    durationSeconds: number,
    silenceBytes: Uint8Array,
  ): void {
    const repeatCount = Math.max(1, Math.round(durationSeconds));
    let totalLength = silenceBytes.length * repeatCount;
    const combined = new Uint8Array(totalLength);

    let offset = 0;
    for (let i = 0; i < repeatCount; i++) {
      combined.set(silenceBytes, offset);
      offset += silenceBytes.length;
    }

    const destFile = new File(medDir, fileName);
    destFile.write(combined);
  }

  private async loadAssetBytes(assetModule: number): Promise<Uint8Array> {
    const [asset] = await Asset.loadAsync(assetModule);
    if (!asset.localUri) {
      throw new Error('Failed to load asset');
    }
    const file = new File(asset.localUri);
    return file.bytes();
  }
}
