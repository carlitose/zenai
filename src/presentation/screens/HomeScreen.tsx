import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, typography } from '../theme';
import { PromptInput } from '../components/PromptInput';
import { QuickOptions } from '../components/QuickOptions';
import { usePreferences } from '../hooks/usePreferences';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { apiKey, defaultDuration } = usePreferences();
  const [prompt, setPrompt] = useState('');
  const [type, setType] = useState<string | undefined>('guided');
  const [duration, setDuration] = useState(defaultDuration);

  const canGenerate = prompt.trim().length > 0 && apiKey.length > 0;

  const handleGenerate = () => {
    navigation.navigate('Generating', {
      prompt: prompt.trim(),
      type,
      durationMinutes: duration,
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {!apiKey && (
          <TouchableOpacity
            style={styles.banner}
            onPress={() => navigation.getParent()?.navigate('Settings')}
          >
            <Text style={styles.bannerText}>
              Set your OpenAI API key in Settings to start generating meditations.
            </Text>
          </TouchableOpacity>
        )}

        <Text style={styles.title}>New Meditation</Text>

        <PromptInput value={prompt} onChangeText={setPrompt} />
        <QuickOptions
          selectedType={type}
          selectedDuration={duration}
          onTypeChange={setType}
          onDurationChange={setDuration}
        />

        <TouchableOpacity
          style={[styles.generateButton, !canGenerate && styles.generateButtonDisabled]}
          onPress={handleGenerate}
          disabled={!canGenerate}
          activeOpacity={0.8}
        >
          <Text style={styles.generateButtonText}>Generate</Text>
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
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  banner: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  bannerText: {
    ...typography.caption,
    color: colors.warning,
  },
  title: {
    ...typography.h2,
    marginBottom: spacing.lg,
  },
  generateButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  generateButtonDisabled: {
    opacity: 0.4,
  },
  generateButtonText: {
    ...typography.h3,
    color: colors.white,
  },
});
