import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { colors, spacing, typography } from '../theme';
import { usePreferences } from '../hooks/usePreferences';
import { VoiceOptions, VoiceOptionLabels, VoiceOption } from '../../domain/value-objects/VoiceOption';

const DURATION_OPTIONS = [5, 10, 15, 20, 30, 40];

export function SettingsScreen() {
  const prefs = usePreferences();
  const [apiKeyInput, setApiKeyInput] = useState(prefs.apiKey);
  const [showApiKey, setShowApiKey] = useState(false);

  // Sync input when prefs load
  React.useEffect(() => {
    setApiKeyInput(prefs.apiKey);
  }, [prefs.apiKey]);

  const handleSaveApiKey = async () => {
    const trimmed = apiKeyInput.trim();
    if (trimmed && !trimmed.startsWith('sk-')) {
      Alert.alert('Invalid API Key', 'OpenAI API keys start with "sk-".');
      return;
    }
    await prefs.setApiKey(trimmed);
    Alert.alert('Saved', 'API key saved successfully.');
  };

  const voices = Object.values(VoiceOptions);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>OpenAI API Key</Text>
      <View style={styles.apiKeyRow}>
        <TextInput
          style={styles.apiKeyInput}
          value={apiKeyInput}
          onChangeText={setApiKeyInput}
          placeholder="sk-..."
          placeholderTextColor={colors.textMuted}
          secureTextEntry={!showApiKey}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => setShowApiKey(!showApiKey)}
        >
          <Text style={styles.toggleText}>{showApiKey ? 'Hide' : 'Show'}</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.saveButton} onPress={handleSaveApiKey}>
        <Text style={styles.saveButtonText}>Save API Key</Text>
      </TouchableOpacity>

      <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Default Voice</Text>
      <View style={styles.optionsRow}>
        {voices.map((voice) => (
          <TouchableOpacity
            key={voice}
            style={[
              styles.chip,
              prefs.defaultVoice === voice && styles.chipSelected,
            ]}
            onPress={() => prefs.setDefaultVoice(voice)}
          >
            <Text
              style={[
                styles.chipText,
                prefs.defaultVoice === voice && styles.chipTextSelected,
              ]}
            >
              {VoiceOptionLabels[voice as VoiceOption]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>
        Default Duration (min)
      </Text>
      <View style={styles.optionsRow}>
        {DURATION_OPTIONS.map((min) => (
          <TouchableOpacity
            key={min}
            style={[
              styles.chip,
              prefs.defaultDuration === min && styles.chipSelected,
            ]}
            onPress={() => prefs.setDefaultDuration(min)}
          >
            <Text
              style={[
                styles.chipText,
                prefs.defaultDuration === min && styles.chipTextSelected,
              ]}
            >
              {min}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  sectionTitle: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  apiKeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  apiKeyInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
  },
  toggleButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  toggleText: {
    ...typography.caption,
    color: colors.accent,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  saveButtonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '600',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
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
