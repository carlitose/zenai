import { useState, useCallback, useRef, useEffect } from 'react';
import { Meditation } from '../../domain/entities/Meditation';
import { container } from '../../di/container';
import { GenerationPhase } from '../../application/use-cases/GenerateMeditationUseCase';
import { BackgroundKeepAlive } from '../../infrastructure/audio/BackgroundKeepAlive';

export function useGenerateMeditation() {
  const [phase, setPhase] = useState<GenerationPhase | null>(null);
  const [meditation, setMeditation] = useState<Meditation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const keepAliveRef = useRef(new BackgroundKeepAlive());

  useEffect(() => {
    return () => {
      keepAliveRef.current.stop();
    };
  }, []);

  const generate = useCallback(async (
    prompt: string,
    type?: string,
    durationMinutes?: number,
    voice?: string,
    speed?: number,
    language?: string,
  ) => {
    try {
      await keepAliveRef.current.start();
      setError(null);
      setPhase({ phase: 'generating_text' });
      const result = await container.generateMeditation.execute(
        { prompt, type, durationMinutes, voice, speed, language },
        setPhase,
      );
      setMeditation(result);
      return result;
    } catch (err: any) {
      const message = err.message ?? 'Error during generation';
      setError(message);
      setPhase(null);
      return null;
    } finally {
      await keepAliveRef.current.stop();
    }
  }, []);

  const reset = useCallback(() => {
    keepAliveRef.current.stop();
    setPhase(null);
    setMeditation(null);
    setError(null);
  }, []);

  return { phase, meditation, error, generate, reset };
}
