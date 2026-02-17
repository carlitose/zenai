import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { radius } from '../theme/radius';
import { shadows } from '../theme/shadows';
import { durations } from '../theme/animations';
import { PromptInput } from '../components/PromptInput';
import { QuickOptions } from '../components/QuickOptions';
import { usePreferences } from '../hooks/usePreferences';
import { RootStackParamList, TabParamList } from '../navigation/types';
import { VoiceOptions, VoiceOptionLabels, VoiceDescriptors, VoiceOption } from '../../domain/value-objects/VoiceOption';
import { ElevenLabsVoices } from '../../domain/value-objects/ElevenLabsVoice';
import { MeditationTypeDefaultPrompts, MeditationType } from '../../domain/value-objects/MeditationType';
import { Languages } from '../../domain/value-objects/Language';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { apiKey, defaultDuration, defaultVoice, defaultSpeed, defaultLanguage, ttsProvider, defaultElevenLabsVoice, elevenLabsApiKey, reload } = usePreferences();
  const isElevenLabs = ttsProvider === 'elevenlabs';

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );
  const [prompt, setPrompt] = useState(MeditationTypeDefaultPrompts.guided);
  const [type, setType] = useState<string | undefined>('guided');
  const [duration, setDuration] = useState(defaultDuration);
  const [voice, setVoice] = useState<string | undefined>(undefined);
  const [speed, setSpeed] = useState(defaultSpeed);
  const [language, setLanguage] = useState<string>('auto');

  const defaultPrompts = Object.values(MeditationTypeDefaultPrompts);

  const handleTypeChange = (newType: string) => {
    setType(newType);
    const isDefaultOrEmpty = prompt.trim() === '' || defaultPrompts.includes(prompt);
    if (isDefaultOrEmpty) {
      setPrompt(MeditationTypeDefaultPrompts[newType as MeditationType] ?? '');
    }
  };

  useEffect(() => {
    setSpeed(defaultSpeed);
  }, [defaultSpeed]);

  useEffect(() => {
    setDuration(defaultDuration);
  }, [defaultDuration]);

  useEffect(() => {
    setLanguage(defaultLanguage);
  }, [defaultLanguage]);

  useEffect(() => {
    setVoice(undefined);
  }, [ttsProvider]);

  const canGenerate = prompt.trim().length > 0 && apiKey.length > 0
    && (!isElevenLabs || elevenLabsApiKey.length > 0);

  // Entrance animation
  const greetingOpacity = useSharedValue(0);
  const greetingTranslateY = useSharedValue(12);

  useEffect(() => {
    greetingOpacity.value = withDelay(200, withTiming(1, { duration: durations.slow }));
    greetingTranslateY.value = withDelay(200, withTiming(0, { duration: durations.slow }));
  }, []);

  const greetingStyle = useAnimatedStyle(() => ({
    opacity: greetingOpacity.value,
    transform: [{ translateY: greetingTranslateY.value }],
  }));

  const speedPresets = [
    { value: 0.75, label: 'Slow' },
    { value: 0.85, label: 'Calm' },
    { value: 0.9, label: 'Normal' },
    { value: 1.0, label: 'Steady' },
    { value: 1.15, label: 'Brisk' },
  ];

  const handleGenerate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('Generating', {
      prompt: prompt.trim(),
      type,
      durationMinutes: duration,
      voice,
      speed,
      language: language !== 'auto' ? language : undefined,
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.headerTitle}>ZenAI</Text>

        {!apiKey && (
          <TouchableOpacity
            style={styles.banner}
            onPress={() => navigation.navigate('Settings')}
          >
            <View style={styles.bannerBorder} />
            <Text style={styles.bannerText}>
              Set your OpenAI API key in Settings to start generating meditations.
            </Text>
          </TouchableOpacity>
        )}

        {isElevenLabs && !elevenLabsApiKey && apiKey.length > 0 && (
          <TouchableOpacity
            style={styles.banner}
            onPress={() => navigation.navigate('Settings')}
          >
            <View style={styles.bannerBorder} />
            <Text style={styles.bannerText}>
              Set your ElevenLabs API key in Settings to use ElevenLabs voices.
            </Text>
          </TouchableOpacity>
        )}

        <Animated.View style={greetingStyle}>
          <Text style={styles.greeting}>What would you like to explore?</Text>
        </Animated.View>

        <PromptInput value={prompt} onChangeText={setPrompt} />
        <QuickOptions
          selectedType={type}
          selectedDuration={duration}
          onTypeChange={handleTypeChange}
          onDurationChange={setDuration}
        />

        {/* Voice Selector */}
        <View style={styles.selectorSection}>
          <View style={styles.selectorHeader}>
            <Ionicons name="mic-outline" size={16} color={colors.terracotta} />
            <Text style={styles.selectorLabel}>Voice</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            <TouchableOpacity
              style={[styles.voiceChip, voice === undefined && styles.voiceChipSelected]}
              onPress={() => setVoice(undefined)}
            >
              <Text style={[styles.voiceChipText, voice === undefined && styles.voiceChipTextSelected]}>
                Default
              </Text>
              <Text style={[styles.voiceChipSub, voice === undefined && styles.voiceChipSubSelected]}>
                {isElevenLabs
                  ? (ElevenLabsVoices.find(v => v.id === defaultElevenLabsVoice)?.label ?? 'River')
                  : defaultVoice.charAt(0).toUpperCase() + defaultVoice.slice(1)}
              </Text>
            </TouchableOpacity>
            {isElevenLabs
              ? ElevenLabsVoices.map((v) => {
                  const isSelected = voice === v.id;
                  return (
                    <TouchableOpacity
                      key={v.id}
                      style={[styles.voiceChip, isSelected && styles.voiceChipSelected]}
                      onPress={() => setVoice(v.id)}
                    >
                      <Text style={[styles.voiceChipText, isSelected && styles.voiceChipTextSelected]}>
                        {v.label}
                      </Text>
                      <Text style={[styles.voiceChipSub, isSelected && styles.voiceChipSubSelected]}>
                        {v.descriptor}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              : Object.values(VoiceOptions).map((v) => {
                  const isSelected = voice === v;
                  return (
                    <TouchableOpacity
                      key={v}
                      style={[styles.voiceChip, isSelected && styles.voiceChipSelected]}
                      onPress={() => setVoice(v)}
                    >
                      <Text style={[styles.voiceChipText, isSelected && styles.voiceChipTextSelected]}>
                        {VoiceOptionLabels[v]}
                      </Text>
                      <Text style={[styles.voiceChipSub, isSelected && styles.voiceChipSubSelected]}>
                        {VoiceDescriptors[v]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
          </ScrollView>
        </View>

        {/* Language Selector */}
        <View style={styles.selectorSection}>
          <View style={styles.selectorHeader}>
            <Ionicons name="globe-outline" size={16} color={colors.accent} />
            <Text style={styles.selectorLabel}>Language</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {Languages.map(({ code, label }) => {
              const isSelected = language === code;
              return (
                <TouchableOpacity
                  key={code}
                  style={[styles.langChip, isSelected && styles.langChipSelected]}
                  onPress={() => setLanguage(code)}
                >
                  <Text style={[styles.langChipText, isSelected && styles.langChipTextSelected]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Speed Selector - only for OpenAI (ElevenLabs speed is in Settings) */}
        {!isElevenLabs && (
          <View style={styles.selectorSection}>
            <View style={styles.selectorHeader}>
              <Ionicons name="speedometer-outline" size={16} color={colors.teal} />
              <Text style={styles.selectorLabel}>Speed</Text>
            </View>
            <View style={styles.speedRow}>
              {speedPresets.map(({ value, label }) => {
                const isSelected = speed === value;
                return (
                  <TouchableOpacity
                    key={value}
                    style={[styles.speedChip, isSelected && styles.speedChipSelected]}
                    onPress={() => setSpeed(value)}
                  >
                    <Text style={[styles.speedChipText, isSelected && styles.speedChipTextSelected]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.generateButton, !canGenerate && styles.generateButtonDisabled]}
          onPress={handleGenerate}
          disabled={!canGenerate}
          activeOpacity={0.8}
        >
          <Ionicons name="leaf" size={18} color={colors.textOnPrimary} style={styles.generateIcon} />
          <Text style={styles.generateButtonText}>Begin Meditation</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
  },
  headerTitle: {
    ...typography.displayMedium,
    color: colors.text,
    marginBottom: spacing.xl,
  },
  banner: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  bannerBorder: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.terracotta,
    borderTopLeftRadius: radius.md,
    borderBottomLeftRadius: radius.md,
  },
  bannerText: {
    ...typography.bodyMedium,
    color: colors.terracotta,
  },
  greeting: {
    ...typography.displaySmall,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  selectorSection: {
    marginBottom: spacing.lg,
  },
  selectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  selectorLabel: {
    ...typography.labelLarge,
    color: colors.textSecondary,
  },
  chipRow: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  voiceChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  voiceChipSelected: {
    backgroundColor: colors.terracottaMuted,
    borderColor: colors.terracotta,
  },
  voiceChipText: {
    ...typography.labelMedium,
    color: colors.textSecondary,
  },
  voiceChipTextSelected: {
    color: colors.terracottaLight,
  },
  voiceChipSub: {
    ...typography.labelSmall,
    color: colors.textMuted,
    marginTop: 1,
  },
  voiceChipSubSelected: {
    color: colors.terracottaLight,
  },
  langChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  langChipSelected: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
  },
  langChipText: {
    ...typography.labelMedium,
    color: colors.textSecondary,
  },
  langChipTextSelected: {
    color: colors.accentLight,
  },
  speedRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  speedChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  speedChipSelected: {
    backgroundColor: colors.tealMuted,
    borderColor: colors.teal,
  },
  speedChipText: {
    ...typography.labelMedium,
    color: colors.textSecondary,
  },
  speedChipTextSelected: {
    color: colors.tealLight,
  },
  generateButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  generateButtonDisabled: {
    opacity: 0.4,
  },
  generateIcon: {
    marginRight: spacing.sm,
  },
  generateButtonText: {
    ...typography.headingMedium,
    color: colors.textOnPrimary,
  },
});
