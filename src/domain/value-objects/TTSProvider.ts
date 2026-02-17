export const TTSProviders = {
  OPENAI: 'openai',
  ELEVENLABS: 'elevenlabs',
} as const;

export type TTSProvider = (typeof TTSProviders)[keyof typeof TTSProviders];
