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
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { radius } from '../theme/radius';
import { shadows } from '../theme/shadows';
import { usePreferences } from '../hooks/usePreferences';
import { VoiceOptions, VoiceDescriptors } from '../../domain/value-objects/VoiceOption';
import { Languages } from '../../domain/value-objects/Language';

const DURATION_OPTIONS = [5, 10, 15, 20, 30, 40];

const SPEED_OPTIONS = [
  { value: 0.75, label: 'Slow' },
  { value: 0.85, label: 'Calm' },
  { value: 0.9, label: 'Normal' },
  { value: 1.0, label: 'Steady' },
  { value: 1.15, label: 'Brisk' },
];

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const prefs = usePreferences();
  const [apiKeyInput, setApiKeyInput] = useState(prefs.apiKey);
  const [showApiKey, setShowApiKey] = useState(false);

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
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.pageTitle}>Settings</Text>

      {/* API Key Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="key-outline" size={18} color={colors.accent} />
          <Text style={styles.sectionTitle}>API Key</Text>
        </View>
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
            style={styles.eyeButton}
            onPress={() => setShowApiKey(!showApiKey)}
          >
            <Ionicons
              name={showApiKey ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveApiKey}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>

      {/* Voice Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="mic-outline" size={18} color={colors.accent} />
          <Text style={styles.sectionTitle}>Default Voice</Text>
        </View>
        <View style={styles.voiceGrid}>
          {voices.map((voice) => {
            const isSelected = prefs.defaultVoice === voice;
            return (
              <TouchableOpacity
                key={voice}
                style={[styles.voiceCard, isSelected && styles.voiceCardSelected]}
                onPress={() => prefs.setDefaultVoice(voice)}
                activeOpacity={0.7}
              >
                <Text style={[styles.voiceName, isSelected && styles.voiceNameSelected]}>
                  {voice.charAt(0).toUpperCase() + voice.slice(1)}
                </Text>
                <Text style={[styles.voiceDescriptor, isSelected && styles.voiceDescriptorSelected]}>
                  {VoiceDescriptors[voice as keyof typeof VoiceDescriptors]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Duration Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="timer-outline" size={18} color={colors.accent} />
          <Text style={styles.sectionTitle}>Default Duration</Text>
        </View>
        <View style={styles.durationRow}>
          {DURATION_OPTIONS.map((min) => {
            const isSelected = prefs.defaultDuration === min;
            return (
              <TouchableOpacity
                key={min}
                style={[styles.durationPill, isSelected && styles.durationPillSelected]}
                onPress={() => prefs.setDefaultDuration(min)}
              >
                <Text style={[styles.durationText, isSelected && styles.durationTextSelected]}>
                  {min}m
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Speed Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="speedometer-outline" size={18} color={colors.accent} />
          <Text style={styles.sectionTitle}>Default Speed</Text>
        </View>
        <View style={styles.durationRow}>
          {SPEED_OPTIONS.map(({ value, label }) => {
            const isSelected = prefs.defaultSpeed === value;
            return (
              <TouchableOpacity
                key={value}
                style={[styles.speedPill, isSelected && styles.speedPillSelected]}
                onPress={() => prefs.setDefaultSpeed(value)}
              >
                <Text style={[styles.speedText, isSelected && styles.speedTextSelected]}>
                  {label}
                </Text>
                <Text style={[styles.speedValue, isSelected && styles.speedValueSelected]}>
                  {value}x
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Language Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="globe-outline" size={18} color={colors.accent} />
          <Text style={styles.sectionTitle}>Default Language</Text>
        </View>
        <View style={styles.durationRow}>
          {Languages.map(({ code, label }) => {
            const isSelected = prefs.defaultLanguage === code;
            return (
              <TouchableOpacity
                key={code}
                style={[styles.langPill, isSelected && styles.langPillSelected]}
                onPress={() => prefs.setDefaultLanguage(code)}
              >
                <Text style={[styles.langText, isSelected && styles.langTextSelected]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* About */}
      <Text style={styles.aboutText}>ZenAI v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.huge,
  },
  pageTitle: {
    ...typography.displaySmall,
    color: colors.text,
    marginBottom: spacing.xl,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.headingMedium,
    color: colors.text,
  },
  apiKeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  apiKeyInput: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...typography.bodyMedium,
    color: colors.text,
  },
  eyeButton: {
    padding: spacing.md,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  saveButtonText: {
    ...typography.labelLarge,
    color: colors.textOnPrimary,
  },
  voiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  voiceCard: {
    width: '23%',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  voiceCardSelected: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  voiceName: {
    ...typography.labelLarge,
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  voiceNameSelected: {
    color: colors.primaryLight,
  },
  voiceDescriptor: {
    ...typography.labelSmall,
    color: colors.textMuted,
  },
  voiceDescriptorSelected: {
    color: colors.primaryLight,
  },
  durationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  durationPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  durationPillSelected: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
  },
  durationText: {
    ...typography.labelLarge,
    color: colors.textSecondary,
  },
  durationTextSelected: {
    color: colors.accentLight,
  },
  speedPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  speedPillSelected: {
    backgroundColor: colors.tealMuted,
    borderColor: colors.teal,
  },
  speedText: {
    ...typography.labelLarge,
    color: colors.textSecondary,
  },
  speedTextSelected: {
    color: colors.tealLight,
  },
  speedValue: {
    ...typography.labelSmall,
    color: colors.textMuted,
    marginTop: 2,
  },
  speedValueSelected: {
    color: colors.tealLight,
  },
  langPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  langPillSelected: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
  },
  langText: {
    ...typography.labelLarge,
    color: colors.textSecondary,
  },
  langTextSelected: {
    color: colors.accentLight,
  },
  aboutText: {
    ...typography.labelMedium,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
