import { MeditationGeneratorPort, GenerateTextInput } from '../../application/ports/MeditationGeneratorPort';
import { VoiceOption } from '../../domain/value-objects/VoiceOption';
import { File, Directory, Paths } from 'expo-file-system';
import { MEDITATION_SYSTEM_PROMPT } from '../../shared/prompts/meditation-system-prompt';

const TTS_VOICE_INSTRUCTIONS = [
  'Delivery: Slow and spacious, with natural pauses between phrases and sentences, allowing the listener to breathe and absorb each word.',
  'Voice: Warm, soft, and reassuring, like a gentle whisper that carries — unhurried, steady, and deeply calming.',
  'Tone: Peaceful, nurturing, and grounded, as if guiding someone through a quiet sanctuary.',
  'Pronunciation: Smooth and flowing, with elongated vowels, gentle inflections, and no sense of urgency or sharpness.',
].join(' ');

export class OpenAIMeditationGenerator implements MeditationGeneratorPort {
  async generateText(input: GenerateTextInput, apiKey: string): Promise<string> {
    const userPrompt = this.buildUserPrompt(input);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: MEDITATION_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const message = (error as any)?.error?.message ?? response.statusText;
      if (response.status === 401) throw new Error('API_KEY_INVALID');
      if (response.status === 429) throw new Error('RATE_LIMIT');
      throw new Error(`OPENAI_TEXT_ERROR: ${message}`);
    }

    const data = await response.json();
    return (data as any).choices[0].message.content;
  }

  async generateSegmentAudio(text: string, voice: VoiceOption, apiKey: string, speed: number = 0.9): Promise<string> {
    if (text.length > 4000) {
      return this.generateLongSegmentAudio(text, voice, apiKey, speed);
    }

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini-tts',
        input: text,
        voice,
        response_format: 'mp3',
        speed,
        instructions: TTS_VOICE_INSTRUCTIONS,
      }),
    });

    if (!response.ok) {
      throw new Error(`OPENAI_TTS_ERROR: ${response.statusText}`);
    }

    return this.saveBlobToFile(response);
  }

  private async generateLongSegmentAudio(
    text: string,
    voice: VoiceOption,
    apiKey: string,
    speed: number = 0.9,
  ): Promise<string> {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const chunks: string[] = [];
    let current = '';

    for (const sentence of sentences) {
      if ((current + sentence).length > 4000) {
        if (current) chunks.push(current.trim());
        current = sentence;
      } else {
        current += sentence;
      }
    }
    if (current) chunks.push(current.trim());

    const paths: string[] = [];
    for (const chunk of chunks) {
      const path = await this.generateSegmentAudio(chunk, voice, apiKey, speed);
      paths.push(path);
    }

    return paths[0];
  }

  private async saveBlobToFile(response: Response): Promise<string> {
    const segmentsDir = new Directory(Paths.cache, 'segments');
    if (!segmentsDir.exists) {
      segmentsDir.create({ intermediates: true });
    }

    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`;
    const file = new File(segmentsDir, fileName);

    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    file.write(bytes);

    return file.uri;
  }

  private buildUserPrompt(input: GenerateTextInput): string {
    let prompt = input.prompt;
    if (input.type) prompt += `\nMeditation type: ${input.type}`;
    if (input.durationMinutes) prompt += `\nTarget total duration: ${input.durationMinutes} minutes`;
    return prompt;
  }
}
