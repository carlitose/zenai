import { StoragePort } from '../ports/StoragePort';
import { TTSProvider } from '../../domain/value-objects/TTSProvider';
import {
  DEFAULT_ELEVENLABS_VOICE,
  ElevenLabsVoiceSettings,
  DEFAULT_ELEVENLABS_VOICE_SETTINGS,
  EL_PREF_KEYS,
} from '../../domain/value-objects/ElevenLabsVoice';

export class ManagePreferencesUseCase {
  constructor(private storage: StoragePort) {}

  async getApiKey(): Promise<string | null> {
    return this.storage.getPreference('apiKey');
  }

  async setApiKey(key: string): Promise<void> {
    await this.storage.setPreference('apiKey', key);
  }

  async getDefaultVoice(): Promise<string> {
    return (await this.storage.getPreference('defaultVoice')) ?? 'nova';
  }

  async setDefaultVoice(voice: string): Promise<void> {
    await this.storage.setPreference('defaultVoice', voice);
  }

  async getDefaultDuration(): Promise<number> {
    const val = await this.storage.getPreference('defaultDuration');
    return val ? parseInt(val, 10) : 10;
  }

  async setDefaultDuration(minutes: number): Promise<void> {
    await this.storage.setPreference('defaultDuration', minutes.toString());
  }

  async getDefaultSpeed(): Promise<number> {
    const val = await this.storage.getPreference('defaultSpeed');
    return val ? parseFloat(val) : 0.9;
  }

  async setDefaultSpeed(speed: number): Promise<void> {
    await this.storage.setPreference('defaultSpeed', speed.toString());
  }

  async getDefaultLanguage(): Promise<string> {
    return (await this.storage.getPreference('defaultLanguage')) ?? 'auto';
  }

  async setDefaultLanguage(language: string): Promise<void> {
    await this.storage.setPreference('defaultLanguage', language);
  }

  async getTtsProvider(): Promise<TTSProvider> {
    return ((await this.storage.getPreference('ttsProvider')) ?? 'openai') as TTSProvider;
  }

  async setTtsProvider(provider: TTSProvider): Promise<void> {
    await this.storage.setPreference('ttsProvider', provider);
  }

  async getElevenLabsApiKey(): Promise<string | null> {
    return this.storage.getPreference('elevenLabsApiKey');
  }

  async setElevenLabsApiKey(key: string): Promise<void> {
    await this.storage.setPreference('elevenLabsApiKey', key);
  }

  async getDefaultElevenLabsVoice(): Promise<string> {
    return (await this.storage.getPreference('defaultElevenLabsVoice')) ?? DEFAULT_ELEVENLABS_VOICE;
  }

  async setDefaultElevenLabsVoice(voiceId: string): Promise<void> {
    await this.storage.setPreference('defaultElevenLabsVoice', voiceId);
  }

  async getElevenLabsVoiceSettings(): Promise<ElevenLabsVoiceSettings> {
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

  async setElevenLabsVoiceSetting(key: keyof ElevenLabsVoiceSettings, value: number | boolean): Promise<void> {
    await this.storage.setPreference(EL_PREF_KEYS[key], String(value));
  }
}
