import { useState, useCallback, useEffect } from 'react';
import { container } from '../../di/container';

export function usePreferences() {
  const [apiKey, setApiKeyState] = useState('');
  const [defaultVoice, setDefaultVoiceState] = useState('nova');
  const [defaultDuration, setDefaultDurationState] = useState(10);
  const [defaultSpeed, setDefaultSpeedState] = useState(0.9);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [key, voice, duration, speed] = await Promise.all([
        container.managePreferences.getApiKey(),
        container.managePreferences.getDefaultVoice(),
        container.managePreferences.getDefaultDuration(),
        container.managePreferences.getDefaultSpeed(),
      ]);
      setApiKeyState(key ?? '');
      setDefaultVoiceState(voice);
      setDefaultDurationState(duration);
      setDefaultSpeedState(speed);
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

  return {
    apiKey,
    defaultVoice,
    defaultDuration,
    defaultSpeed,
    isLoading,
    setApiKey,
    setDefaultVoice,
    setDefaultDuration,
    setDefaultSpeed,
    reload: load,
  };
}
