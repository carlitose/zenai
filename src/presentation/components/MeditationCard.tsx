import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme';
import { Meditation } from '../../domain/entities/Meditation';
import { MeditationTypeLabels, MeditationType } from '../../domain/value-objects/MeditationType';

interface Props {
  meditation: Meditation;
  onPress: () => void;
  onDelete: () => void;
}

export function MeditationCard({ meditation, onPress, onDelete }: Props) {
  const handleDelete = () => {
    Alert.alert(
      'Delete Meditation',
      'Are you sure you want to delete this meditation?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ],
    );
  };

  const typeLabel = MeditationTypeLabels[meditation.type as MeditationType] ?? meditation.type;
  const dateStr = meditation.createdAt.toLocaleDateString();

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{typeLabel}</Text>
        </View>
        <TouchableOpacity onPress={handleDelete} hitSlop={8}>
          <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <Text style={styles.excerpt} numberOfLines={2}>
        {meditation.excerpt}
      </Text>

      <View style={styles.footer}>
        <Text style={styles.meta}>{meditation.formattedDuration}</Text>
        <Text style={styles.meta}>{dateStr}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  badge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    ...typography.small,
    color: colors.white,
    fontWeight: '600',
  },
  excerpt: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  meta: {
    ...typography.small,
    color: colors.textMuted,
  },
});
