import { File, Directory, Paths } from 'expo-file-system';
import { ElevenLabsVoiceSettings } from '../../domain/value-objects/ElevenLabsVoice';
import { Mp3Concatenator } from '../audio/Mp3Concatenator';
import { stripMp3Metadata, calculateMp3Duration } from '../audio/Mp3FrameUtils';

const ELEVENLABS_TTS_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
const MODEL_ID = 'eleven_flash_v2_5';
const MAX_CHUNK_LENGTH = 4000;

export interface TimestampAlignment {
  characters: string[];
  characterStartTimesSeconds: number[];
  characterEndTimesSeconds: number[];
}

export interface FullAudioWithTimestampsResult {
  audioData: Uint8Array;
  alignment: TimestampAlignment;
}

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

  async generateFullAudioWithTimestamps(
    text: string,
    voiceId: string,
    apiKey: string,
    settings: ElevenLabsVoiceSettings,
    language?: string,
  ): Promise<FullAudioWithTimestampsResult> {
    if (text.length <= MAX_CHUNK_LENGTH) {
      return this.callWithTimestamps(text, voiceId, apiKey, settings, language);
    }

    // Split into sentence-based chunks for long text
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const chunks: string[] = [];
    let current = '';

    for (const sentence of sentences) {
      if ((current + sentence).length > MAX_CHUNK_LENGTH - 500) {
        if (current) chunks.push(current);
        current = sentence;
      } else {
        current += sentence;
      }
    }
    if (current) chunks.push(current);

    const audioBuffers: Uint8Array[] = [];
    const previousIds: string[] = [];
    const allChars: string[] = [];
    const allStarts: number[] = [];
    const allEnds: number[] = [];
    let timeOffset = 0;

    for (let i = 0; i < chunks.length; i++) {
      const nextText = i < chunks.length - 1 ? chunks[i + 1] : undefined;
      const result = await this.callWithTimestamps(
        chunks[i], voiceId, apiKey, settings, language, previousIds, nextText,
      );

      const strippedAudio = stripMp3Metadata(result.audioData);
      audioBuffers.push(strippedAudio);
      if (result.requestId) previousIds.push(result.requestId);

      // Merge alignment with time offset
      for (let j = 0; j < result.alignment.characters.length; j++) {
        allChars.push(result.alignment.characters[j]);
        allStarts.push(result.alignment.characterStartTimesSeconds[j] + timeOffset);
        allEnds.push(result.alignment.characterEndTimesSeconds[j] + timeOffset);
      }

      // Use real audio duration for offset (not alignment end time)
      const chunkAudioDuration = calculateMp3Duration(strippedAudio);
      timeOffset += chunkAudioDuration;
    }

    // Concatenate audio buffers
    let totalLen = 0;
    for (const buf of audioBuffers) totalLen += buf.length;
    const combined = new Uint8Array(totalLen);
    let offset = 0;
    for (const buf of audioBuffers) {
      combined.set(buf, offset);
      offset += buf.length;
    }

    return {
      audioData: combined,
      alignment: {
        characters: allChars,
        characterStartTimesSeconds: allStarts,
        characterEndTimesSeconds: allEnds,
      },
    };
  }

  private async callWithTimestamps(
    text: string,
    voiceId: string,
    apiKey: string,
    settings: ElevenLabsVoiceSettings,
    language?: string,
    previousRequestIds?: string[],
    nextText?: string,
  ): Promise<FullAudioWithTimestampsResult & { requestId?: string }> {
    const url = `${ELEVENLABS_TTS_URL}/${voiceId}/with-timestamps?output_format=mp3_44100_128`;

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
    if (previousRequestIds && previousRequestIds.length > 0) {
      body.previous_request_ids = previousRequestIds.slice(-3);
    }
    if (nextText) {
      body.next_text = nextText;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
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

    const data = await response.json();
    const requestId = data.request_id ?? response.headers.get('request-id') ?? undefined;

    // Decode base64 audio
    const binaryStr = atob(data.audio_base64);
    const audioData = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      audioData[i] = binaryStr.charCodeAt(i);
    }

    return {
      audioData,
      alignment: {
        characters: data.alignment?.characters ?? [],
        characterStartTimesSeconds: data.alignment?.character_start_times_seconds ?? [],
        characterEndTimesSeconds: data.alignment?.character_end_times_seconds ?? [],
      },
      requestId,
    };
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
