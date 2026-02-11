import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gradients } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { radius } from '../theme/radius';
import { shadows } from '../theme/shadows';
import { GenerationProgress } from '../components/GenerationProgress';
import { useGenerateMeditation } from '../hooks/useGenerateMeditation';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'Generating'>;

export function GeneratingScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const { phase, meditation, error, generate, reset } = useGenerateMeditation();

  useEffect(() => {
    const { prompt, type, durationMinutes, voice, speed } = route.params;
    generate(prompt, type, durationMinutes, voice, speed);
  }, []);

  useEffect(() => {
    if (meditation && phase?.phase === 'done') {
      navigation.replace('Player', { meditation });
    }
  }, [meditation, phase, navigation]);

  const handleCancel = () => {
    reset();
    navigation.goBack();
  };

  const handleRetry = () => {
    reset();
    const { prompt, type, durationMinutes, voice, speed } = route.params;
    generate(prompt, type, durationMinutes, voice, speed);
  };

  return (
    <LinearGradient
      colors={[...gradients.player]}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <View style={styles.content}>
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        ) : phase ? (
          <GenerationProgress phase={phase} />
        ) : null}
      </View>

      {!error && (
        <TouchableOpacity
          style={[styles.cancelFooter, { paddingBottom: insets.bottom + spacing.lg }]}
          onPress={handleCancel}
        >
          <Text style={styles.cancelFooterText}>Cancel</Text>
        </TouchableOpacity>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  errorContainer: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    ...typography.bodyLarge,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  retryButtonText: {
    ...typography.headingMedium,
    color: colors.textOnPrimary,
  },
  cancelButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
  },
  cancelButtonText: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
  },
  cancelFooter: {
    alignItems: 'center',
    paddingTop: spacing.lg,
  },
  cancelFooterText: {
    ...typography.labelLarge,
    color: colors.textMuted,
  },
});
