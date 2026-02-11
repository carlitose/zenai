import { Meditation } from '../../domain/entities/Meditation';

export type RootStackParamList = {
  MainTabs: undefined;
  Player: { meditation: Meditation };
  Generating: { prompt: string; type?: string; durationMinutes?: number; voice?: string; speed?: number };
};

export type TabParamList = {
  Create: undefined;
  Library: undefined;
  Settings: undefined;
};
