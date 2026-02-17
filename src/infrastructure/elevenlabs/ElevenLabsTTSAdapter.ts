import { File, Directory, Paths } from 'expo-file-system';
import { ElevenLabsVoiceSettings } from '../../domain/value-objects/ElevenLabsVoice';
import { Mp3Concatenator } from '../audio/Mp3Concatenator';

const ELEVENLABS_TTS_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
const MODEL_ID = 'eleven_flash_v2_5';
const MAX_CHUNK_LENGTH = 5000;

export class ElevenLabsTTSAdapter {
  async generateSegmentAudio(
    text: string,
    voiceId: string,
    apiKey: string,
    settings: ElevenLabsVoiceSettings,
    language?: string,
  ): Promise<string> {
    if (text.length > MAX_CHUNK_LENGTH) {
      return this.generateLongSegmentAudio(text, voiceId, apiKey, settings, language);
    }

    const url = `${ELEVENLABS_TTS_URL}/${voiceId}?output_format=mp3_44100_128`;

    const body: Record<string, unknown> = {
      text,
      model_id: MODEL_ID,
      voice_settings: {
        stability: settings.stability,
        similarity_boost: settings.similarityBoost,
        style: settings.style,
        use_speaker_boost: settings.useSpeakerBoost,
        speed: settings.speed,
      },
    };

    if (language) {
      body.language_code = language;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('ELEVENLABS_API_KEY_INVALID');
      }
      if (response.status === 429) {
        throw new Error('ELEVENLABS_RATE_LIMIT');
      }
      let message = response.statusText;
      try {
        const err = await response.json();
        message = err?.detail?.message ?? err?.detail ?? message;
      } catch {}
      throw new Error(`ELEVENLABS_TTS_ERROR: ${message}`);
    }

    return this.saveBlobToFile(response);
  }

  private async generateLongSegmentAudio(
    text: string,
    voiceId: string,
    apiKey: string,
    settings: ElevenLabsVoiceSettings,
    language?: string,
  ): Promise<string> {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const chunks: string[] = [];
    let current = '';

    for (const sentence of sentences) {
      if ((current + sentence).length > MAX_CHUNK_LENGTH) {
        if (current) chunks.push(current.trim());
        current = sentence;
      } else {
        current += sentence;
      }
    }
    if (current) chunks.push(current.trim());

    const paths: string[] = [];
    for (const chunk of chunks) {
      const path = await this.generateSegmentAudio(chunk, voiceId, apiKey, settings, language);
      paths.push(path);
    }

    if (paths.length === 1) return paths[0];

    const segmentsDir = new Directory(Paths.cache, 'segments');
    if (!segmentsDir.exists) {
      segmentsDir.create({ intermediates: true });
    }
    const outputName = `${Date.now()}-${Math.random().toString(36).slice(2)}-combined.mp3`;
    const outputFile = new File(segmentsDir, outputName);
    await Mp3Concatenator.concatenate(paths, outputFile.uri);

    for (const p of paths) {
      try { const f = new File(p); if (f.exists) f.delete(); } catch {}
    }

    return outputFile.uri;
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
