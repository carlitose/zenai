import { MeditationGeneratorPort, GenerateTextInput } from '../../application/ports/MeditationGeneratorPort';
import { StoragePort } from '../../application/ports/StoragePort';
import { OpenAIMeditationGenerator } from '../openai/OpenAIMeditationGenerator';
import { ElevenLabsTTSAdapter, FullAudioWithTimestampsResult } from '../elevenlabs/ElevenLabsTTSAdapter';
import {
  ElevenLabsVoiceSettings,
  DEFAULT_ELEVENLABS_VOICE_SETTINGS,
  EL_PREF_KEYS,
} from '../../domain/value-objects/ElevenLabsVoice';

export class HybridMeditationGenerator implements MeditationGeneratorPort {
  constructor(
    private openaiGenerator: OpenAIMeditationGenerator,
    private elevenLabsTTS: ElevenLabsTTSAdapter,
    private storage: StoragePort,
  ) {}

  async generateText(input: GenerateTextInput, apiKey: string): Promise<string> {
    return this.openaiGenerator.generateText(input, apiKey);
  }

  async generateSegmentAudio(
    text: string,
    voice: string,
    _apiKey: string,
    speed?: number,
    language?: string,
  ): Promise<string> {
    const provider = (await this.storage.getPreference('ttsProvider')) || 'openai';

    if (provider === 'elevenlabs') {
      const elApiKey = await this.storage.getPreference('elevenLabsApiKey');
      if (!elApiKey) throw new Error('ELEVENLABS_API_KEY_MISSING');

      const settings = await this.loadElevenLabsVoiceSettings();
      return this.elevenLabsTTS.generateSegmentAudio(text, voice, elApiKey, settings, language);
    }

    return this.openaiGenerator.generateSegmentAudio(text, voice, _apiKey, speed, language);
  }

  async generateFullAudioWithTimestamps(
    text: string,
    voice: string,
    language?: string,
  ): Promise<FullAudioWithTimestampsResult | null> {
    const provider = (await this.storage.getPreference('ttsProvider')) || 'openai';
    if (provider !== 'elevenlabs') return null;

    const elApiKey = await this.storage.getPreference('elevenLabsApiKey');
    if (!elApiKey) throw new Error('ELEVENLABS_API_KEY_MISSING');

    const settings = await this.loadElevenLabsVoiceSettings();
    return this.elevenLabsTTS.generateFullAudioWithTimestamps(text, voice, elApiKey, settings, language);
  }

  private async loadElevenLabsVoiceSettings(): Promise<ElevenLabsVoiceSettings> {
    const [stability, similarityBoost, style, useSpeakerBoost, speed] = await Promise.all([
      this.storage.getPreference(EL_PREF_KEYS.stability),
      this.storage.getPreference(EL_PREF_KEYS.similarityBoost),
      this.storage.getPreference(EL_PREF_KEYS.style),
      this.storage.getPreference(EL_PREF_KEYS.useSpeakerBoost),
      this.storage.getPreference(EL_PREF_KEYS.speed),
    ]);
    return {
      stability: stability != null ? parseFloat(stability) : DEFAULT_ELEVENLABS_VOICE_SETTINGS.stability,
      similarityBoost: similarityBoost != null ? parseFloat(similarityBoost) : DEFAULT_ELEVENLABS_VOICE_SETTINGS.similarityBoost,
      style: style != null ? parseFloat(style) : DEFAULT_ELEVENLABS_VOICE_SETTINGS.style,
      useSpeakerBoost: useSpeakerBoost != null ? useSpeakerBoost === 'true' : DEFAULT_ELEVENLABS_VOICE_SETTINGS.useSpeakerBoost,
      speed: speed != null ? parseFloat(speed) : DEFAULT_ELEVENLABS_VOICE_SETTINGS.speed,
    };
  }
}
