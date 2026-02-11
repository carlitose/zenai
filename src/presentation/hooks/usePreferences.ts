import { useState, useCallback, useEffect } from 'react';
import { container } from '../../di/container';

export function usePreferences() {
  const [apiKey, setApiKeyState] = useState('');
  const [defaultVoice, setDefaultVoiceState] = useState('nova');
  const [defaultDuration, setDefaultDurationState] = useState(10);
  const [defaultSpeed, setDefaultSpeedState] = useState(0.9);
  const [defaultLanguage, setDefaultLanguageState] = useState('auto');
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [key, voice, duration, speed, language] = await Promise.all([
        container.managePreferences.getApiKey(),
        container.managePreferences.getDefaultVoice(),
        container.managePreferences.getDefaultDuration(),
        container.managePreferences.getDefaultSpeed(),
        container.managePreferences.getDefaultLanguage(),
      ]);
      setApiKeyState(key ?? '');
      setDefaultVoiceState(voice);
      setDefaultDurationState(duration);
      setDefaultSpeedState(speed);
      setDefaultLanguageState(language);
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

  return {
    apiKey,
    defaultVoice,
    defaultDuration,
    defaultSpeed,
    defaultLanguage,
    isLoading,
    setApiKey,
    setDefaultVoice,
    setDefaultDuration,
    setDefaultSpeed,
    setDefaultLanguage,
    reload: load,
  };
}
