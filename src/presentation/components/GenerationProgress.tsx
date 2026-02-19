import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GenerationPhase } from '../../application/use-cases/GenerateMeditationUseCase';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { radius } from '../theme/radius';
import { BreathingOrb } from './BreathingOrb';

interface Props {
  phase: GenerationPhase;
}

export function GenerationProgress({ phase }: Props) {
  const getMessage = () => {
    switch (phase.phase) {
      case 'generating_text':
        return 'Composing your meditation...';
      case 'generating_audio':
        return `Giving it a voice... (${phase.current}/${phase.total})`;
      case 'generating_full_audio':
        return 'Giving it a voice...';
      case 'splitting_audio':
        return 'Almost there...';
      case 'saving':
        return 'Almost there...';
      case 'done':
        return 'Ready';
    }
  };

  const getProgress = () => {
    switch (phase.phase) {
      case 'generating_text':
        return 0.1;
      case 'generating_audio':
        return 0.1 + (phase.current / phase.total) * 0.8;
      case 'generating_full_audio':
        return 0.5;
      case 'splitting_audio':
        return 0.85;
      case 'saving':
        return 0.95;
      case 'done':
        return 1;
    }
  };

  return (
    <View style={styles.container}>
      <BreathingOrb size={120} isActive={phase.phase !== 'done'} />

      <Text style={styles.message}>{getMessage()}</Text>

      <View style={styles.progressBarContainer}>
        <View style={styles.progressTrack}>
          <LinearGradient
            colors={[colors.primary, colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: `${getProgress() * 100}%` }]}
          />
        </View>
      </View>

      {phase.phase === 'generating_audio' && (
        <Text style={styles.stepCounter}>
          Step {phase.current} of {phase.total}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  message: {
    ...typography.displaySmall,
    color: colors.text,
    marginTop: spacing.xl,
    textAlign: 'center',
  },
  progressBarContainer: {
    width: '60%',
    marginTop: spacing.xl,
  },
  progressTrack: {
    height: 3,
    backgroundColor: colors.surfaceHighlight,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.sm,
  },
  stepCounter: {
    ...typography.labelMedium,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
});
