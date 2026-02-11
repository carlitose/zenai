import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { radius } from '../theme/radius';
import { shadows } from '../theme/shadows';
import { durations } from '../theme/animations';

const MAX_CHARS = 2000;
const WARN_CHARS = 1800;

const AnimatedView = Animated.createAnimatedComponent(View);

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  editable?: boolean;
}

export function PromptInput({ value, onChangeText, editable = true }: Props) {
  const focusProgress = useSharedValue(0);

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      focusProgress.value,
      [0, 1],
      [colors.border, colors.primary],
    ),
  }));

  return (
    <View style={styles.container}>
      <AnimatedView style={[styles.inputWrapper, borderStyle]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={(text) => onChangeText(text.slice(0, MAX_CHARS))}
          placeholder="Describe the meditation you'd like to experience..."
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          editable={editable}
          onFocus={() => {
            focusProgress.value = withTiming(1, { duration: durations.fast });
          }}
          onBlur={() => {
            focusProgress.value = withTiming(0, { duration: durations.fast });
          }}
        />
      </AnimatedView>
      <Text
        style={[
          styles.counter,
          value.length > WARN_CHARS && styles.counterWarn,
        ]}
      >
        {value.length}/{MAX_CHARS}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  inputWrapper: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  input: {
    ...typography.bodyLarge,
    color: colors.text,
    padding: spacing.lg,
    minHeight: 140,
  },
  counter: {
    ...typography.labelSmall,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: spacing.xs,
    paddingRight: spacing.xs,
  },
  counterWarn: {
    color: colors.terracotta,
  },
});
