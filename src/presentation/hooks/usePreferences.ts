import { useState, useCallback, useEffect } from 'react';
import { container } from '../../di/container';
import { TTSProvider } from '../../domain/value-objects/TTSProvider';
import {
  DEFAULT_ELEVENLABS_VOICE,
  ElevenLabsVoiceSettings,
  DEFAULT_ELEVENLABS_VOICE_SETTINGS,
} from '../../domain/value-objects/ElevenLabsVoice';

export function usePreferences() {
  const [apiKey, setApiKeyState] = useState('');
  const [defaultVoice, setDefaultVoiceState] = useState('nova');
  const [defaultDuration, setDefaultDurationState] = useState(10);
  const [defaultSpeed, setDefaultSpeedState] = useState(0.9);
  const [defaultLanguage, setDefaultLanguageState] = useState('auto');
  const [ttsProvider, setTtsProviderState] = useState<TTSProvider>('openai');
  const [elevenLabsApiKey, setElevenLabsApiKeyState] = useState('');
  const [defaultElevenLabsVoice, setDefaultElevenLabsVoiceState] = useState(DEFAULT_ELEVENLABS_VOICE);
  const [elVoiceSettings, setElVoiceSettingsState] = useState<ElevenLabsVoiceSettings>(DEFAULT_ELEVENLABS_VOICE_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [key, voice, duration, speed, language, provider, elKey, elVoice, elSettings] = await Promise.all([
        container.managePreferences.getApiKey(),
        container.managePreferences.getDefaultVoice(),
        container.managePreferences.getDefaultDuration(),
        container.managePreferences.getDefaultSpeed(),
        container.managePreferences.getDefaultLanguage(),
        container.managePreferences.getTtsProvider(),
        container.managePreferences.getElevenLabsApiKey(),
        container.managePreferences.getDefaultElevenLabsVoice(),
        container.managePreferences.getElevenLabsVoiceSettings(),
      ]);
      setApiKeyState(key ?? '');
      setDefaultVoiceState(voice);
      setDefaultDurationState(duration);
      setDefaultSpeedState(speed);
      setDefaultLanguageState(language);
      setTtsProviderState(provider);
      setElevenLabsApiKeyState(elKey ?? '');
      setDefaultElevenLabsVoiceState(elVoice);
      setElVoiceSettingsState(elSettings);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setApiKey = useCallback(async (key: string) => {
    await container.managePreferences.setApiKey(key);
    setApiKeyState(key);
  }, []);

  const setDefaultVoice = useCallback(async (voice: string) => {
    await container.managePreferences.setDefaultVoice(voice);
    setDefaultVoiceState(voice);
  }, []);

  const setDefaultDuration = useCallback(async (minutes: number) => {
    await container.managePreferences.setDefaultDuration(minutes);
    setDefaultDurationState(minutes);
  }, []);

  const setDefaultSpeed = useCallback(async (speed: number) => {
    await container.managePreferences.setDefaultSpeed(speed);
    setDefaultSpeedState(speed);
  }, []);

  const setDefaultLanguage = useCallback(async (language: string) => {
    await container.managePreferences.setDefaultLanguage(language);
    setDefaultLanguageState(language);
  }, []);

  const setTtsProvider = useCallback(async (provider: TTSProvider) => {
    await container.managePreferences.setTtsProvider(provider);
    setTtsProviderState(provider);
  }, []);

  const setElevenLabsApiKey = useCallback(async (key: string) => {
    await container.managePreferences.setElevenLabsApiKey(key);
    setElevenLabsApiKeyState(key);
  }, []);

  const setDefaultElevenLabsVoice = useCallback(async (voiceId: string) => {
    await container.managePreferences.setDefaultElevenLabsVoice(voiceId);
    setDefaultElevenLabsVoiceState(voiceId);
  }, []);

  const setElVoiceSetting = useCallback(async (key: keyof ElevenLabsVoiceSettings, value: number | boolean) => {
    await container.managePreferences.setElevenLabsVoiceSetting(key, value);
    setElVoiceSettingsState(prev => ({ ...prev, [key]: value }));
  }, []);

  return {
    apiKey,
    defaultVoice,
    defaultDuration,
    defaultSpeed,
    defaultLanguage,
    ttsProvider,
    elevenLabsApiKey,
    defaultElevenLabsVoice,
    elVoiceSettings,
    isLoading,
    setApiKey,
    setDefaultVoice,
    setDefaultDuration,
    setDefaultSpeed,
    setDefaultLanguage,
    setTtsProvider,
    setElevenLabsApiKey,
    setDefaultElevenLabsVoice,
    setElVoiceSetting,
    reload: load,
  };
}
