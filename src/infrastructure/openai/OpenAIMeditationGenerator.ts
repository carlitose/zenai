import { MeditationGeneratorPort, GenerateTextInput } from '../../application/ports/MeditationGeneratorPort';
import { VoiceOption } from '../../domain/value-objects/VoiceOption';
import { File, Directory, Paths } from 'expo-file-system';

const WORDS_PER_MINUTE = 120;

const SYSTEM_PROMPT = `You are an expert meditation guide. Generate a meditation script based on the user's request.

CRITICAL RULES FOR DURATION AND SILENCE:
- The user will specify a target duration in minutes.
- Spoken words are delivered at approximately ${WORDS_PER_MINUTE} words per minute (at TTS speed 0.9).
- Micro-pauses of 1.5-2 seconds are AUTOMATICALLY inserted between every few sentences during playback. You do NOT need to add short pauses between sentences — they are handled by the system.
- Use [SILENT Xs] markers ONLY for intentional long pauses (10 seconds or more): breathing exercises, body scanning, moments of deep silence.
- You MUST include tibetan bell sounds using the marker [DONG] for transitions.
- Silences are essential: they allow the listener to breathe, observe, and be present. A meditation is NOT a continuous monologue.
- Plan the total duration as: spoken_words / ${WORDS_PER_MINUTE} + sum_of_silences + (dong_count * 2.5) + automatic_micro_pauses = target_duration
- Automatic micro-pauses add roughly 10-15% extra time to spoken sections. Account for this in your word count estimates.
- Use "..." (ellipsis) in the script where you want a slightly longer reflective pause between sentences.

DONG RULES:
- Use [DONG] to mark tibetan bell sounds (fixed ~2.5s duration)
- Place [DONG] at the very beginning of the meditation
- Place [DONG] at major transitions between sections
- Place [DONG] at the very end of the meditation
- Maximum 3-5 [DONG] markers per meditation
- [DONG] should be on its own line, like silence markers

DURATION GUIDELINES (accounting for ~1.5s automatic micro-pauses every 3 sentences):
- For a 5-minute meditation: ~3.25 min speech (~390 words) + ~1.75 min silence
- For a 10-minute meditation: ~6.5 min speech (~780 words) + ~3.5 min silence
- For a 15-minute meditation: ~9.5 min speech (~1140 words) + ~5.5 min silence
- For a 20-minute meditation: ~11.5 min speech (~1380 words) + ~8.5 min silence
- For a 30-minute meditation: ~15.5 min speech (~1860 words) + ~14.5 min silence
- For a 40-minute meditation: ~19 min speech (~2280 words) + ~21 min silence

FORMATTING:
- Write ONLY the meditation script, no meta-commentary.
- Use [SILENT Xs] markers on their own line for long pauses (10s+).
- Use [DONG] markers on their own line.
- Example: "[DONG]\\nWelcome. Close your eyes and take a deep breath...\\n[SILENT 15s]\\nNotice how your body feels. Let your attention rest gently on the present moment...\\n[DONG]\\n..."

Respond in the same language as the user's prompt.`;

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
          { role: 'system', content: SYSTEM_PROMPT },
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

  async generateSegmentAudio(text: string, voice: VoiceOption, apiKey: string): Promise<string> {
    if (text.length > 4000) {
      return this.generateLongSegmentAudio(text, voice, apiKey);
    }

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice,
        response_format: 'mp3',
        speed: 0.9,
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
      const path = await this.generateSegmentAudio(chunk, voice, apiKey);
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
