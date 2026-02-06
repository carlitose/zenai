import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, typography } from '../theme';
import { GenerationProgress } from '../components/GenerationProgress';
import { useGenerateMeditation } from '../hooks/useGenerateMeditation';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'Generating'>;

export function GeneratingScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { phase, meditation, error, generate, reset } = useGenerateMeditation();

  useEffect(() => {
    const { prompt, type, durationMinutes } = route.params;
    generate(prompt, type, durationMinutes);
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
    const { prompt, type, durationMinutes } = route.params;
    generate(prompt, type, durationMinutes);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : phase ? (
          <GenerationProgress phase={phase} />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorContainer: {
    alignItems: 'center',
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  retryButtonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  cancelButtonText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
