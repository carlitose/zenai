import { useState, useCallback } from 'react';
import { Meditation } from '../../domain/entities/Meditation';
import { container } from '../../di/container';
import { GenerationPhase } from '../../application/use-cases/GenerateMeditationUseCase';

export function useGenerateMeditation() {
  const [phase, setPhase] = useState<GenerationPhase | null>(null);
  const [meditation, setMeditation] = useState<Meditation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (
    prompt: string,
    type?: string,
    durationMinutes?: number,
    voice?: string,
    speed?: number,
  ) => {
    try {
      setError(null);
      setPhase({ phase: 'generating_text' });
      const result = await container.generateMeditation.execute(
        { prompt, type, durationMinutes, voice, speed },
        setPhase,
      );
      setMeditation(result);
      return result;
    } catch (err: any) {
      const message = err.message ?? 'Error during generation';
      setError(message);
      setPhase(null);
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setPhase(null);
    setMeditation(null);
    setError(null);
  }, []);

  return { phase, meditation, error, generate, reset };
}
