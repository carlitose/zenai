import React from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../theme';

const MAX_CHARS = 2000;

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  editable?: boolean;
}

export function PromptInput({ value, onChangeText, editable = true }: Props) {
  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={(text) => onChangeText(text.slice(0, MAX_CHARS))}
        placeholder="Describe your meditation..."
        placeholderTextColor={colors.textMuted}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        editable={editable}
      />
      <Text style={styles.counter}>
        {value.length}/{MAX_CHARS}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...typography.body,
    minHeight: 120,
    color: colors.text,
  },
  counter: {
    ...typography.small,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
});
