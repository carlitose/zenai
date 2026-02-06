import { VoiceOption } from '../../domain/value-objects/VoiceOption';

export interface GenerateTextInput {
  prompt: string;
  type?: string;
  durationMinutes?: number;
}

export interface MeditationGeneratorPort {
  generateText(input: GenerateTextInput, apiKey: string): Promise<string>;
  generateSegmentAudio(text: string, voice: VoiceOption, apiKey: string): Promise<string>;
}
