export const colors = {
  // Backgrounds
  background: '#1A1612',
  backgroundSecondary: '#231E19',
  surface: '#2C2520',
  surfaceElevated: '#362E28',
  surfaceHighlight: '#40372F',

  // Primary (Sage Green)
  primary: '#7A9E7E',
  primaryLight: '#97B89A',
  primaryDark: '#5E7D62',
  primaryMuted: 'rgba(122,158,126,0.15)',

  // Accent (Warm Gold)
  accent: '#C4A265',
  accentLight: '#D4B87E',
  accentMuted: 'rgba(196,162,101,0.12)',

  // Terracotta
  terracotta: '#B87356',
  terracottaLight: '#D08E72',
  terracottaMuted: 'rgba(184,115,86,0.15)',

  // Teal
  teal: '#6B9E9B',
  tealLight: '#89B5B2',
  tealMuted: 'rgba(107,158,155,0.15)',

  // Text
  text: '#EDE5DA',
  textSecondary: '#A99E92',
  textMuted: '#6E645B',
  textOnPrimary: '#1A1612',

  // Semantic
  error: '#C75B4A',
  success: '#7A9E7E',
  warning: '#C4A265',

  // Borders
  border: '#3A322C',
  borderLight: '#4A413A',

  // Utility
  overlay: 'rgba(26,22,18,0.85)',
  white: '#FEFCF9',
  black: '#0F0D0B',
};

export const gradients = {
  sunrise: ['#2C2520', '#362E28', '#3D3028'] as const,
  aurora: ['rgba(122,158,126,0.08)', 'rgba(196,162,101,0.05)', 'transparent'] as const,
  player: ['#1A1612', '#231E19', '#2C2520'] as const,
};
