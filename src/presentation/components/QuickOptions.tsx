import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors, spacing, typography } from '../theme';
import { MeditationTypes, MeditationTypeLabels, MeditationType } from '../../domain/value-objects/MeditationType';

const DURATION_OPTIONS = [5, 10, 15, 20, 30, 40];

interface Props {
  selectedType: string | undefined;
  selectedDuration: number;
  onTypeChange: (type: string) => void;
  onDurationChange: (minutes: number) => void;
}

export function QuickOptions({ selectedType, selectedDuration, onTypeChange, onDurationChange }: Props) {
  const types = Object.values(MeditationTypes);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Type</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
        {types.map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.chip, selectedType === type && styles.chipSelected]}
            onPress={() => onTypeChange(type)}
          >
            <Text style={[styles.chipText, selectedType === type && styles.chipTextSelected]}>
              {MeditationTypeLabels[type as MeditationType]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={[styles.label, { marginTop: spacing.md }]}>Duration (min)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
        {DURATION_OPTIONS.map((min) => (
          <TouchableOpacity
            key={min}
            style={[styles.chip, selectedDuration === min && styles.chipSelected]}
            onPress={() => onDurationChange(min)}
          >
            <Text style={[styles.chipText, selectedDuration === min && styles.chipTextSelected]}>
              {min}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.caption,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.white,
    fontWeight: '600',
  },
});
