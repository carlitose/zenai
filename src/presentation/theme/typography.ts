import { TextStyle } from 'react-native';
import { colors } from './colors';

export const typography: Record<string, TextStyle> = {
  h1: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.text,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.text,
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  small: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textMuted,
  },
};
