export interface ElevenLabsVoiceEntry {
  id: string;
  label: string;
  descriptor: string;
}

export const ElevenLabsVoices: ElevenLabsVoiceEntry[] = [
  { id: 'SAz9YHcvj6GT2YYXdXww', label: 'River', descriptor: 'Calm' },
  { id: 'Tfv2PGiTliSQ4XSXrJmA', label: 'Katherine', descriptor: 'Warm' },
  { id: 'KoVIHoyLDrQyd4pGalbs', label: 'Autumn Veil', descriptor: 'Reflective' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', label: 'George', descriptor: 'Storyteller' },
  { id: 'nPczCjzI2devNBz1zQrb', label: 'Brian', descriptor: 'Comforting' },
  { id: 'pqHfZKP75CvOlQylNhV4', label: 'Bill', descriptor: 'Wise' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', label: 'Lily', descriptor: 'Velvety' },
  { id: 'oVJbgLwL0s5pk9e2U6QH', label: 'Manuela', descriptor: 'Italian' },
];

export const ElevenLabsVoiceIds = ElevenLabsVoices.map((v) => v.id);

export const DEFAULT_ELEVENLABS_VOICE = ElevenLabsVoices[0].id;

export interface ElevenLabsVoiceSettings {
  stability: number;
  similarityBoost: number;
  style: number;
  useSpeakerBoost: boolean;
  speed: number;
}

export const DEFAULT_ELEVENLABS_VOICE_SETTINGS: ElevenLabsVoiceSettings = {
  stability: 0.65,
  similarityBoost: 0.9,
  style: 0.4,
  useSpeakerBoost: true,
  speed: 0.7,
};

export const EL_PREF_KEYS = {
  stability: 'elStability',
  similarityBoost: 'elSimilarityBoost',
  style: 'elStyle',
  useSpeakerBoost: 'elUseSpeakerBoost',
  speed: 'elSpeed',
} as const;

export const EL_STABILITY_PRESETS = [
  { value: 0.15, label: 'Very Low' },
  { value: 0.3, label: 'Low' },
  { value: 0.5, label: 'Medium' },
  { value: 0.75, label: 'High' },
  { value: 0.95, label: 'Very High' },
];

export const EL_SIMILARITY_PRESETS = [
  { value: 0.3, label: 'Low' },
  { value: 0.5, label: 'Medium' },
  { value: 0.75, label: 'High' },
  { value: 0.9, label: 'Very High' },
  { value: 1.0, label: 'Max' },
];

export const EL_STYLE_PRESETS = [
  { value: 0.0, label: 'None' },
  { value: 0.2, label: 'Subtle' },
  { value: 0.4, label: 'Moderate' },
  { value: 0.6, label: 'Expressive' },
  { value: 0.8, label: 'Dramatic' },
];

export const EL_SPEED_PRESETS = [
  { value: 0.5, label: 'Very Slow' },
  { value: 0.7, label: 'Slow' },
  { value: 0.85, label: 'Calm' },
  { value: 1.0, label: 'Normal' },
  { value: 1.2, label: 'Fast' },
];
