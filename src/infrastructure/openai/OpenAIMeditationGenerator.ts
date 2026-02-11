import { MeditationGeneratorPort, GenerateTextInput } from '../../application/ports/MeditationGeneratorPort';
import { VoiceOption } from '../../domain/value-objects/VoiceOption';
import { File, Directory, Paths } from 'expo-file-system';

const WORDS_PER_MINUTE = 130;

const TTS_VOICE_INSTRUCTIONS = [
  'Delivery: Slow and spacious, with natural pauses between phrases and sentences, allowing the listener to breathe and absorb each word.',
  'Voice: Warm, soft, and reassuring, like a gentle whisper that carries — unhurried, steady, and deeply calming.',
  'Tone: Peaceful, nurturing, and grounded, as if guiding someone through a quiet sanctuary.',
  'Pronunciation: Smooth and flowing, with elongated vowels, gentle inflections, and no sense of urgency or sharpness.',
].join(' ');

const SYSTEM_PROMPT = `You are an expert meditation guide. Generate a meditation script.

DONG RULES (STRICT - NO EXCEPTIONS):
- Use EXACTLY 6 [DONG] markers total:
  • 3 [DONG] at the very beginning (on separate lines)
  • 3 [DONG] at the very end (on separate lines)
- NO [DONG] anywhere else in the meditation
- After the 3 opening DONGs, guide 3-4 deep breaths WITH YOUR VOICE

STRUCTURE (MANDATORY):
[DONG]
[SILENT 3s]
[DONG]
[SILENT 3s]
[DONG]
[SILENT 5s]
Take a deep breath in...
[SILENT 8s]
And slowly exhale...
[SILENT 8s]
Another deep breath... filling your lungs completely...
[SILENT 8s]
And gently release...
[SILENT 8s]
One more breath... inhale deeply...
[SILENT 10s]
And let everything go...
[SILENT 3s]
(main meditation content with [SILENT 2-3s] after each sentence)
[SILENT 3s]
(closing sentence)
[SILENT 3s]
[DONG]
[SILENT 3s]
[DONG]
[SILENT 3s]
[DONG]

DURATION RULES (CRITICAL - USE REASONING TO CALCULATE):
1. Calculate word count: (target_minutes - silence_minutes - 0.25) * ${WORDS_PER_MINUTE}
2. Total silence: at least 25% of target duration
3. For 10 min: ~900 words speech + ~150s silence + 15s DONGs
4. For 5 min: ~425 words speech + ~75s silence + 15s DONGs
5. For 15 min: ~1300 words speech + ~230s silence + 15s DONGs
6. VERIFY word count before outputting
7. Most silence will be micro-pauses (2-3s). Plan for ~25-40 silence markers in a 10-min meditation.

SILENCE DISTRIBUTION (STRICT - MAX 15s):
- Micro (2-3s): after EVERY 1-2 sentences. No speech block may exceed 2 sentences without a [SILENT] marker.
- Short (5s): after questions, topic transitions
- Medium (8-15s): breathing exercises, body awareness pauses
- MAXIMUM silence is [SILENT 15s]. NEVER exceed 15.
- A 10-minute meditation needs AT LEAST 120s of total silence

PACING RULES (CRITICAL):
- After every sentence ending with "." insert [SILENT 3s]
- After sentences ending with ";" insert [SILENT 2s]
- Use commas and ellipses ("...") for gentle pacing within sentences — the TTS voice pauses naturally at these. Do NOT add [SILENT] markers at commas.
- NEVER write more than 2 consecutive sentences without a [SILENT] marker
- The script should feel like a slow, spacious conversation — not a lecture

FORMATTING:
- Write ONLY the meditation script, no meta-commentary
- [SILENT Xs] markers on their own line
- [DONG] markers on their own line
- Each spoken sentence should be followed by a [SILENT] marker on the next line
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
