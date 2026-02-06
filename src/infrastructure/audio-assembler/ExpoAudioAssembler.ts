import { AudioAssemblerPort, SegmentManifestEntry } from '../../application/ports/AudioAssemblerPort';
import { MeditationSegment } from '../../domain/value-objects/MeditationSegment';
import { expandWithSentencePauses } from './SentencePauseProcessor';
import { File, Directory, Paths } from 'expo-file-system';
import { Asset } from 'expo-asset';

const WORDS_PER_MINUTE = 120;
const DONG_DURATION_SECONDS = 2.5;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const dongAsset = require('../../../assets/sounds/dong.mp3');

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
  ): Promise<SegmentManifestEntry[]> {
    const medDir = new Directory(meditationDirUri);
    if (!medDir.exists) {
      medDir.create({ intermediates: true });
    }

    const manifest: SegmentManifestEntry[] = [];
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
      } else if (segment.type === 'silence') {
        manifest.push({
          type: 'silence',
          durationSeconds: segment.durationSeconds,
        });
      }
    }

    return manifest;
  }

  estimateDuration(segments: MeditationSegment[]): number {
    return segments.reduce((total, seg) => total + seg.durationSeconds, 0);
  }
}
