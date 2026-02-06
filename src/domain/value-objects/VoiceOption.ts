export const VoiceOptions = {
  ALLOY: 'alloy',
  ECHO: 'echo',
  FABLE: 'fable',
  NOVA: 'nova',
  ONYX: 'onyx',
  SHIMMER: 'shimmer',
} as const;

export type VoiceOption = (typeof VoiceOptions)[keyof typeof VoiceOptions];

export const VoiceOptionLabels: Record<VoiceOption, string> = {
  alloy: 'Alloy',
  echo: 'Echo',
  fable: 'Fable',
  nova: 'Nova',
  onyx: 'Onyx',
  shimmer: 'Shimmer',
};
