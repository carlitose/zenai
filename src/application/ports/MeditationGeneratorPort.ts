export interface GenerateTextInput {
  prompt: string;
  type?: string;
  durationMinutes?: number;
  language?: string;
}

export interface MeditationGeneratorPort {
  generateText(input: GenerateTextInput, apiKey: string): Promise<string>;
  generateSegmentAudio(text: string, voice: string, apiKey: string, speed?: number, language?: string): Promise<string>;
}
