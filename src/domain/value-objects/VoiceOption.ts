export const VoiceOptions = {
  ALLOY: 'alloy',
  ASH: 'ash',
  BALLAD: 'ballad',
  CEDAR: 'cedar',
  CORAL: 'coral',
  ECHO: 'echo',
  FABLE: 'fable',
  MARIN: 'marin',
  NOVA: 'nova',
  ONYX: 'onyx',
  SAGE: 'sage',
  SHIMMER: 'shimmer',
  VERSE: 'verse',
} as const;

export type VoiceOption = (typeof VoiceOptions)[keyof typeof VoiceOptions];

export const VoiceOptionLabels: Record<VoiceOption, string> = {
  alloy: 'Alloy',
  ash: 'Ash',
  ballad: 'Ballad',
  cedar: 'Cedar',
  coral: 'Coral',
  echo: 'Echo',
  fable: 'Fable',
  marin: 'Marin',
  nova: 'Nova',
  onyx: 'Onyx',
  sage: 'Sage',
  shimmer: 'Shimmer',
  verse: 'Verse',
};

export const VoiceDescriptors: Record<VoiceOption, string> = {
  alloy: 'Neutral',
  ash: 'Steady',
  ballad: 'Melodic',
  cedar: 'Grounded',
  coral: 'Lively',
  echo: 'Deep',
  fable: 'Warm',
  marin: 'Serene',
  nova: 'Bright',
  onyx: 'Rich',
  sage: 'Gentle',
  shimmer: 'Soft',
  verse: 'Poetic',
};
