import { Meditation } from '../../domain/entities/Meditation';

export type RootStackParamList = {
  MainTabs: undefined;
  Player: { meditation: Meditation };
  Generating: { prompt: string; type?: string; durationMinutes?: number };
};

export type TabParamList = {
  Home: undefined;
  History: undefined;
  Settings: undefined;
};
