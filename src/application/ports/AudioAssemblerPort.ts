import { MeditationSegment } from '../../domain/value-objects/MeditationSegment';

export interface SegmentManifestEntry {
  type: 'speech' | 'silence' | 'dong';
  file?: string;
  durationSeconds: number;
}

export interface AudioAssemblerPort {
  parseSegments(generatedText: string): MeditationSegment[];
  expandWithPauses(segments: MeditationSegment[]): MeditationSegment[];
  saveSegments(
    segments: MeditationSegment[],
    meditationDir: string,
  ): Promise<SegmentManifestEntry[]>;
  estimateDuration(segments: MeditationSegment[]): number;
}
