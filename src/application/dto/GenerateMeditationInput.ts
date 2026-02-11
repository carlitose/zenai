export interface GenerateMeditationInput {
  prompt: string;
  type?: string;
  durationMinutes?: number;
  voice?: string;
  speed?: number;
  language?: string;
}
