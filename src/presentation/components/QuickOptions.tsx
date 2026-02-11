import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { radius } from '../theme/radius';
import { MeditationTypes, MeditationTypeLabels, MeditationType } from '../../domain/value-objects/MeditationType';

const DURATION_OPTIONS = [5, 10, 15, 20, 30, 40];

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  guided: 'compass-outline',
  vipassana: 'eye-outline',
  sleep: 'moon-outline',
  relaxation: 'water-outline',
  self_compassion: 'heart-outline',
  breathing: 'leaf-outline',
};

interface Props {
  selectedType: string | undefined;
  selectedDuration: number;
  onTypeChange: (type: string) => void;
  onDurationChange: (minutes: number) => void;
}

function AnimatedChip({
  selected,
  onPress,
  children,
  variant,
}: {
  selected: boolean;
  onPress: () => void;
  children: React.ReactNode;
  variant: 'type' | 'duration';
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 400 }, () => {
      scale.value = withSpring(1, { damping: 12, stiffness: 300 });
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const selectedBg = variant === 'type' ? colors.primaryMuted : colors.accentMuted;
  const selectedBorder = variant === 'type' ? colors.primary : colors.accent;
  const selectedTextColor = variant === 'type' ? colors.primaryLight : colors.accentLight;

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={[
          styles.chip,
          selected && { backgroundColor: selectedBg, borderColor: selectedBorder },
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.chipContent}>
          {React.Children.map(children, (child) =>
            typeof child === 'string' ? (
              <Text
                style={[
                  styles.chipText,
                  selected && { color: selectedTextColor, fontWeight: '600' },
                ]}
              >
                {child}
              </Text>
            ) : (
              child
            ),
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function QuickOptions({ selectedType, selectedDuration, onTypeChange, onDurationChange }: Props) {
  const types = Object.values(MeditationTypes);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Type</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
        {types.map((type) => {
          const isSelected = selectedType === type;
          return (
            <AnimatedChip
              key={type}
              selected={isSelected}
              onPress={() => onTypeChange(type)}
              variant="type"
            >
              <Ionicons
                name={TYPE_ICONS[type] || 'ellipse-outline'}
                size={14}
                color={isSelected ? colors.primaryLight : colors.textSecondary}
                style={styles.chipIcon}
              />
              {MeditationTypeLabels[type as MeditationType]}
            </AnimatedChip>
          );
        })}
      </ScrollView>

      <Text style={[styles.label, { marginTop: spacing.lg }]}>Duration (min)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
        {DURATION_OPTIONS.map((min) => (
          <AnimatedChip
            key={min}
            selected={selectedDuration === min}
            onPress={() => onDurationChange(min)}
            variant="duration"
          >
            {`${min}`}
          </AnimatedChip>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
  label: {
    ...typography.labelMedium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  row: {
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipIcon: {
    marginRight: spacing.xs,
  },
  chipText: {
    ...typography.labelLarge,
    color: colors.textSecondary,
  },
});
