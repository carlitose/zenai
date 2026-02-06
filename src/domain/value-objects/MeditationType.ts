export const MeditationTypes = {
  GUIDED: 'guided',
  VIPASSANA: 'vipassana',
  SLEEP: 'sleep',
  RELAXATION: 'relaxation',
  SELF_COMPASSION: 'self_compassion',
  BREATHING: 'breathing',
} as const;

export type MeditationType = (typeof MeditationTypes)[keyof typeof MeditationTypes];

export const MeditationTypeLabels: Record<MeditationType, string> = {
  guided: 'Guided',
  vipassana: 'Vipassana',
  sleep: 'Sleep',
  relaxation: 'Relaxation',
  self_compassion: 'Self Compassion',
  breathing: 'Breathing',
};
