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

export const MeditationTypeDefaultPrompts: Record<MeditationType, string> = {
  guided: 'A gentle guided meditation to find inner peace and calm',
  vipassana: 'A vipassana meditation focused on observing sensations and cultivating equanimity',
  sleep: 'A soothing meditation to release the day and drift into deep, restful sleep',
  relaxation: 'A calming body scan to release tension and restore a sense of ease',
  self_compassion: 'A loving-kindness meditation to nurture self-compassion and acceptance',
  breathing: 'A mindful breathing meditation, following the natural rhythm of each breath',
};
