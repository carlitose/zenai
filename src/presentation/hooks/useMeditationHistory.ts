import { useState, useCallback, useEffect } from 'react';
import { Meditation } from '../../domain/entities/Meditation';
import { container } from '../../di/container';

export function useMeditationHistory() {
  const [meditations, setMeditations] = useState<Meditation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await container.getMeditationHistory.execute();
      setMeditations(list);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteMeditation = useCallback(async (id: string) => {
    await container.deleteMeditation.execute(id);
    setMeditations(prev => prev.filter(m => m.id !== id));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { meditations, isLoading, refresh, deleteMeditation };
}
