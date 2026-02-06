export interface MeditationSegment {
  type: 'speech' | 'silence' | 'dong';
  content: string;
  durationSeconds: number;
  audioFilePath?: string;
}
