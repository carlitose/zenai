import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { radius } from '../theme/radius';
import { shadows } from '../theme/shadows';
import { Meditation } from '../../domain/entities/Meditation';
import { MeditationTypeLabels, MeditationType } from '../../domain/value-objects/MeditationType';

interface Props {
  meditation: Meditation;
  onPress: () => void;
  onDelete: () => void;
}

export function MeditationCard({ meditation, onPress, onDelete }: Props) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 300 });
  };

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
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        <View style={styles.header}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{typeLabel}</Text>
          </View>
          <TouchableOpacity onPress={handleDelete} hitSlop={8}>
            <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <Text style={styles.excerpt} numberOfLines={2}>
          {meditation.excerpt}
        </Text>

        <View style={styles.footer}>
          <View style={styles.durationRow}>
            <Ionicons name="time-outline" size={13} color={colors.textMuted} />
            <Text style={styles.meta}>{meditation.formattedDuration}</Text>
          </View>
          <Text style={styles.meta}>{dateStr}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  badge: {
    backgroundColor: colors.terracottaMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  badgeText: {
    ...typography.labelSmall,
    color: colors.terracotta,
    fontWeight: '600',
  },
  excerpt: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  meta: {
    ...typography.labelSmall,
    color: colors.textMuted,
  },
});
