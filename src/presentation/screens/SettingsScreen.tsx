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
import {
  ElevenLabsVoices,
  EL_STABILITY_PRESETS,
  EL_SIMILARITY_PRESETS,
  EL_STYLE_PRESETS,
  EL_SPEED_PRESETS,
} from '../../domain/value-objects/ElevenLabsVoice';
import { TTSProviders, TTSProvider } from '../../domain/value-objects/TTSProvider';
import { Languages } from '../../domain/value-objects/Language';

const DURATION_OPTIONS = [5, 10, 15, 20, 30, 40];

const SPEED_OPTIONS = [
  { value: 0.75, label: 'Slow' },
  { value: 0.85, label: 'Calm' },
  { value: 0.9, label: 'Normal' },
  { value: 1.0, label: 'Steady' },
  { value: 1.15, label: 'Brisk' },
];

const TTS_PROVIDER_OPTIONS: { value: TTSProvider; label: string }[] = [
  { value: TTSProviders.OPENAI, label: 'OpenAI' },
  { value: TTSProviders.ELEVENLABS, label: 'ElevenLabs' },
];

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const prefs = usePreferences();
  const [apiKeyInput, setApiKeyInput] = useState(prefs.apiKey);
  const [showApiKey, setShowApiKey] = useState(false);
  const [elApiKeyInput, setElApiKeyInput] = useState(prefs.elevenLabsApiKey);
  const [showElApiKey, setShowElApiKey] = useState(false);

  React.useEffect(() => {
    setApiKeyInput(prefs.apiKey);
  }, [prefs.apiKey]);

  React.useEffect(() => {
    setElApiKeyInput(prefs.elevenLabsApiKey);
  }, [prefs.elevenLabsApiKey]);

  const handleSaveApiKey = async () => {
    const trimmed = apiKeyInput.trim();
    if (trimmed && !trimmed.startsWith('sk-')) {
      Alert.alert('Invalid API Key', 'OpenAI API keys start with "sk-".');
      return;
    }
    await prefs.setApiKey(trimmed);
    Alert.alert('Saved', 'API key saved successfully.');
  };

  const handleSaveElApiKey = async () => {
    const trimmed = elApiKeyInput.trim();
    if (trimmed && !trimmed.startsWith('sk_')) {
      Alert.alert('Invalid API Key', 'ElevenLabs API keys typically start with "sk_".');
      return;
    }
    await prefs.setElevenLabsApiKey(trimmed);
    Alert.alert('Saved', 'ElevenLabs API key saved successfully.');
  };

  const isElevenLabs = prefs.ttsProvider === 'elevenlabs';
  const openaiVoices = Object.values(VoiceOptions);

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
          <Text style={styles.sectionTitle}>OpenAI API Key</Text>
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

      {/* TTS Provider Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="swap-horizontal-outline" size={18} color={colors.accent} />
          <Text style={styles.sectionTitle}>TTS Provider</Text>
        </View>
        <View style={styles.durationRow}>
          {TTS_PROVIDER_OPTIONS.map(({ value, label }) => {
            const isSelected = prefs.ttsProvider === value;
            return (
              <TouchableOpacity
                key={value}
                style={[styles.providerPill, isSelected && styles.providerPillSelected]}
                onPress={() => prefs.setTtsProvider(value)}
              >
                <Text style={[styles.providerText, isSelected && styles.providerTextSelected]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ElevenLabs API Key - visible only when provider is elevenlabs */}
      {isElevenLabs && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="key-outline" size={18} color={colors.teal} />
            <Text style={styles.sectionTitle}>ElevenLabs API Key</Text>
          </View>
          <View style={styles.apiKeyRow}>
            <TextInput
              style={styles.apiKeyInput}
              value={elApiKeyInput}
              onChangeText={setElApiKeyInput}
              placeholder="sk_..."
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showElApiKey}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowElApiKey(!showElApiKey)}
            >
              <Ionicons
                name={showElApiKey ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.saveButton} onPress={handleSaveElApiKey}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ElevenLabs Voice Settings */}
      {isElevenLabs && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="options-outline" size={18} color={colors.teal} />
            <Text style={styles.sectionTitle}>Voice Settings</Text>
          </View>

          {/* Stability */}
          <Text style={styles.settingLabel}>Stability</Text>
          <Text style={styles.settingHint}>Lower = more emotional variation</Text>
          <View style={styles.durationRow}>
            {EL_STABILITY_PRESETS.map(({ value, label }) => {
              const isSelected = prefs.elVoiceSettings.stability === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[styles.elPill, isSelected && styles.elPillSelected]}
                  onPress={() => prefs.setElVoiceSetting('stability', value)}
                >
                  <Text style={[styles.elPillText, isSelected && styles.elPillTextSelected]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Similarity Boost */}
          <Text style={[styles.settingLabel, { marginTop: spacing.lg }]}>Similarity</Text>
          <Text style={styles.settingHint}>Higher = more consistent to original voice</Text>
          <View style={styles.durationRow}>
            {EL_SIMILARITY_PRESETS.map(({ value, label }) => {
              const isSelected = prefs.elVoiceSettings.similarityBoost === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[styles.elPill, isSelected && styles.elPillSelected]}
                  onPress={() => prefs.setElVoiceSetting('similarityBoost', value)}
                >
                  <Text style={[styles.elPillText, isSelected && styles.elPillTextSelected]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Style */}
          <Text style={[styles.settingLabel, { marginTop: spacing.lg }]}>Style</Text>
          <Text style={styles.settingHint}>Higher = more style exaggeration</Text>
          <View style={styles.durationRow}>
            {EL_STYLE_PRESETS.map(({ value, label }) => {
              const isSelected = prefs.elVoiceSettings.style === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[styles.elPill, isSelected && styles.elPillSelected]}
                  onPress={() => prefs.setElVoiceSetting('style', value)}
                >
                  <Text style={[styles.elPillText, isSelected && styles.elPillTextSelected]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Speed */}
          <Text style={[styles.settingLabel, { marginTop: spacing.lg }]}>Speed</Text>
          <View style={styles.durationRow}>
            {EL_SPEED_PRESETS.map(({ value, label }) => {
              const isSelected = prefs.elVoiceSettings.speed === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[styles.elPill, isSelected && styles.elPillSelected]}
                  onPress={() => prefs.setElVoiceSetting('speed', value)}
                >
                  <Text style={[styles.elPillText, isSelected && styles.elPillTextSelected]}>
                    {label}
                  </Text>
                  <Text style={[styles.elPillValue, isSelected && styles.elPillValueSelected]}>
                    {value}x
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Speaker Boost */}
          <Text style={[styles.settingLabel, { marginTop: spacing.lg }]}>Speaker Boost</Text>
          <Text style={styles.settingHint}>Enhances voice clarity</Text>
          <View style={styles.durationRow}>
            {[true, false].map((val) => {
              const isSelected = prefs.elVoiceSettings.useSpeakerBoost === val;
              return (
                <TouchableOpacity
                  key={String(val)}
                  style={[styles.elPill, isSelected && styles.elPillSelected]}
                  onPress={() => prefs.setElVoiceSetting('useSpeakerBoost', val)}
                >
                  <Text style={[styles.elPillText, isSelected && styles.elPillTextSelected]}>
                    {val ? 'ON' : 'OFF'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Voice Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="mic-outline" size={18} color={colors.accent} />
          <Text style={styles.sectionTitle}>Default Voice</Text>
        </View>
        <View style={styles.voiceGrid}>
          {isElevenLabs
            ? ElevenLabsVoices.map((voice) => {
                const isSelected = prefs.defaultElevenLabsVoice === voice.id;
                return (
                  <TouchableOpacity
                    key={voice.id}
                    style={[styles.voiceCard, isSelected && styles.voiceCardSelected]}
                    onPress={() => prefs.setDefaultElevenLabsVoice(voice.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.voiceName, isSelected && styles.voiceNameSelected]}>
                      {voice.label}
                    </Text>
                    <Text style={[styles.voiceDescriptor, isSelected && styles.voiceDescriptorSelected]}>
                      {voice.descriptor}
                    </Text>
                  </TouchableOpacity>
                );
              })
            : openaiVoices.map((voice) => {
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

      {/* Speed Section - only for OpenAI (ElevenLabs speed is in Voice Settings) */}
      {!isElevenLabs && (
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
      )}

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
  providerPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  providerPillSelected: {
    backgroundColor: colors.tealMuted,
    borderColor: colors.teal,
  },
  providerText: {
    ...typography.labelLarge,
    color: colors.textSecondary,
  },
  providerTextSelected: {
    color: colors.tealLight,
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
  settingLabel: {
    ...typography.labelLarge,
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  settingHint: {
    ...typography.labelSmall,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  elPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  elPillSelected: {
    backgroundColor: colors.tealMuted,
    borderColor: colors.teal,
  },
  elPillText: {
    ...typography.labelLarge,
    color: colors.textSecondary,
  },
  elPillTextSelected: {
    color: colors.tealLight,
  },
  elPillValue: {
    ...typography.labelSmall,
    color: colors.textMuted,
    marginTop: 2,
  },
  elPillValueSelected: {
    color: colors.tealLight,
  },
  aboutText: {
    ...typography.labelMedium,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
