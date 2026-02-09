import { MeditationGeneratorPort, GenerateTextInput } from '../../application/ports/MeditationGeneratorPort';
import { VoiceOption } from '../../domain/value-objects/VoiceOption';
import { File, Directory, Paths } from 'expo-file-system';

const WORDS_PER_MINUTE = 130;

const SYSTEM_PROMPT = `You are an expert meditation guide. Generate a meditation script.

DONG RULES (STRICT - NO EXCEPTIONS):
- Use EXACTLY 6 [DONG] markers total:
  • 3 [DONG] at the very beginning (on separate lines)
  • 3 [DONG] at the very end (on separate lines)
- NO [DONG] anywhere else in the meditation
- After the 3 opening DONGs, guide 3-4 deep breaths WITH YOUR VOICE

STRUCTURE (MANDATORY):
[DONG]
[SILENT 5s]
[DONG]
[SILENT 5s]
[DONG]
[SILENT 5s]
[Voice guides breathing: "Take a deep breath in...[SILENT 5s] and slowly exhale...[SILENT 5s]"]
[SILENT 5s]
[Voice: "Another deep breath... [SILENT 5s] filling your lungs... [SILENT 5s] and release...[SILENT 5s]"]
[SILENT 5s]
[Voice: "One more breath... [SILENT 5s] inhale deeply... [SILENT 5s] and let go... [SILENT 5s]"]
[SILENT 10s]
... main meditation content with silences ...
[Voice: closing words...]
[DONG]
[SILENT 5s]
[DONG]
[SILENT 5s]
[DONG]
[SILENT 5s]

DURATION RULES (CRITICAL - USE REASONING TO CALCULATE):
1. Calculate the exact word count needed: (target_minutes - silence_minutes - 0.25) * ${WORDS_PER_MINUTE}
2. Calculate total silence needed: at least 30% of target duration
3. For 10 min: ~850 words speech + ~180s total silence + 15s DONGs
4. For 5 min: ~400 words speech + ~90s total silence + 15s DONGs
5. For 15 min: ~1200 words speech + ~270s total silence + 15s DONGs
6. VERIFY your word count matches the calculation before outputting

SILENCE DISTRIBUTION:
- Short (5-10s): between phrases, after questions
- Medium (15-30s): breathing exercises, body awareness
- Long (30-60s): deep observation, body scan sections
- A 10-minute meditation needs AT LEAST 150s of total silence

FORMATTING:
- Write ONLY the meditation script, no meta-commentary
- [SILENT Xs] markers on their own line
- [DONG] markers on their own line
- Respond in the same language as the user's prompt`;

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
