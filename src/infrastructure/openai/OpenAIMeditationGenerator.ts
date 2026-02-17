import { MeditationGeneratorPort, GenerateTextInput } from '../../application/ports/MeditationGeneratorPort';
import { File, Directory, Paths } from 'expo-file-system';
import { MEDITATION_SYSTEM_PROMPT, TTS_VOICE_INSTRUCTIONS, TEXT_GENERATION_MODEL, TEXT_GENERATION_REASONING, TEXT_GENERATION_MAX_OUTPUT_TOKENS, buildUserPrompt } from '../../shared/prompts/meditation-system-prompt';

export class OpenAIMeditationGenerator implements MeditationGeneratorPort {
  async generateText(input: GenerateTextInput, apiKey: string): Promise<string> {
    const userPrompt = buildUserPrompt(input);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'https://api.openai.com/v1/responses');
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Authorization', `Bearer ${apiKey}`);

      let lastIndex = 0;
      let fullContent = '';
      let buffer = '';

      xhr.onreadystatechange = () => {
        if (xhr.readyState >= 3 && xhr.status === 200) {
          const newData = xhr.responseText.substring(lastIndex);
          lastIndex = xhr.responseText.length;

          const combined = buffer + newData;
          const lines = combined.split('\n');
          buffer = lines.pop()!;
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const event = JSON.parse(data);
              if (event.type === 'response.output_text.delta') {
                fullContent += event.delta;
              }
            } catch {}
          }
        }

        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            resolve(fullContent);
          } else if (xhr.status === 401) {
            reject(new Error('API_KEY_INVALID'));
          } else if (xhr.status === 429) {
            reject(new Error('RATE_LIMIT'));
          } else {
            let message = xhr.statusText;
            try {
              const err = JSON.parse(xhr.responseText);
              message = err?.error?.message ?? message;
            } catch {}
            reject(new Error(`OPENAI_TEXT_ERROR: ${message}`));
          }
        }
      };

      xhr.onerror = () => reject(new Error('OPENAI_TEXT_ERROR: Network error'));

      xhr.send(JSON.stringify({
        model: TEXT_GENERATION_MODEL,
        instructions: MEDITATION_SYSTEM_PROMPT,
        input: [{ role: 'user', content: userPrompt }],
        reasoning: TEXT_GENERATION_REASONING,
        max_output_tokens: TEXT_GENERATION_MAX_OUTPUT_TOKENS,
        stream: true,
      }));
    });
  }

  async generateSegmentAudio(text: string, voice: string, apiKey: string, speed: number = 0.9, language?: string): Promise<string> {
    if (text.length > 4000) {
      return this.generateLongSegmentAudio(text, voice, apiKey, speed, language);
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
        ...(language ? { language } : {}),
      }),
    });

    if (!response.ok) {
      throw new Error(`OPENAI_TTS_ERROR: ${response.statusText}`);
    }

    return this.saveBlobToFile(response);
  }

  private async generateLongSegmentAudio(
    text: string,
    voice: string,
    apiKey: string,
    speed: number = 0.9,
    language?: string,
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
      const path = await this.generateSegmentAudio(chunk, voice, apiKey, speed, language);
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
}
