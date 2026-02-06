import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GenerationPhase } from '../../application/use-cases/GenerateMeditationUseCase';
import { colors, spacing, typography } from '../theme';
import { LoadingIndicator } from './LoadingIndicator';

interface Props {
  phase: GenerationPhase;
}

export function GenerationProgress({ phase }: Props) {
  const getMessage = () => {
    switch (phase.phase) {
      case 'generating_text':
        return 'Generating meditation text...';
      case 'generating_audio':
        return `Generating audio segment ${phase.current}/${phase.total}...`;
      case 'saving':
        return 'Saving meditation...';
      case 'done':
        return 'Done!';
    }
  };

  const getProgress = () => {
    switch (phase.phase) {
      case 'generating_text':
        return 0.1;
      case 'generating_audio':
        return 0.1 + (phase.current / phase.total) * 0.8;
      case 'saving':
        return 0.95;
      case 'done':
        return 1;
    }
  };

  return (
    <View style={styles.container}>
      <LoadingIndicator />
      <Text style={styles.message}>{getMessage()}</Text>
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressFill, { width: `${getProgress() * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  message: {
    ...typography.body,
    color: colors.text,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  progressBarContainer: {
    width: '80%',
    height: 4,
    backgroundColor: colors.surfaceLight,
    borderRadius: 2,
    marginTop: spacing.lg,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
});
