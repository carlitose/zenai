import { TextStyle } from 'react-native';

export const fontFamilies = {
  serif: 'DMSerifDisplay_400Regular',
  sans: 'Nunito_400Regular',
  sansMedium: 'Nunito_500Medium',
  sansSemiBold: 'Nunito_600SemiBold',
  sansBold: 'Nunito_700Bold',
};

export const typography: Record<string, TextStyle> = {
  displayLarge: {
    fontFamily: fontFamilies.serif,
    fontSize: 32,
    fontWeight: '400',
    lineHeight: 40,
  },
  displayMedium: {
    fontFamily: fontFamilies.serif,
    fontSize: 28,
    fontWeight: '400',
    lineHeight: 36,
  },
  displaySmall: {
    fontFamily: fontFamilies.serif,
    fontSize: 24,
    fontWeight: '400',
    lineHeight: 32,
  },
  headingLarge: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
  },
  headingMedium: {
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
  },
  bodyLarge: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 26,
  },
  bodyMedium: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 22,
  },
  labelLarge: {
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  labelMedium: {
    fontFamily: fontFamilies.sansMedium,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
  },
  labelSmall: {
    fontFamily: fontFamilies.sansMedium,
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16,
  },
};
