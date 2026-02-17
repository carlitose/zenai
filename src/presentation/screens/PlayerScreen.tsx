import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gradients } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { radius } from '../theme/radius';
import { AudioPlayerControls } from '../components/AudioPlayerControls';
import { BreathingOrb } from '../components/BreathingOrb';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { RootStackParamList } from '../navigation/types';
import { MeditationTypeLabels, MeditationType } from '../../domain/value-objects/MeditationType';

type Route = RouteProp<RootStackParamList, 'Player'>;

export function PlayerScreen() {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const { meditation } = route.params;
  const player = useAudioPlayer();

  useEffect(() => {
    player.load(meditation.audioFilePath, meditation.actualDuration);
    return () => {
      player.unload();
    };
  }, []);

  const typeLabel =
    MeditationTypeLabels[meditation.type as MeditationType] ?? meditation.type;

  const cleanText = meditation.generatedText
    .replace(/\[SILENT\s+\d+s?\]/gi, '\n\n~ ~ ~\n\n')
    .replace(/\[DONG\]/gi, '\n\n~ ~ ~\n\n')
    .trim();

  return (
    <LinearGradient
      colors={[...gradients.player]}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-down" size={28} color={colors.text} />
        </TouchableOpacity>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.orbContainer}>
        <BreathingOrb size={140} isActive={player.status.isPlaying} />
      </View>

      <View style={styles.meta}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{typeLabel}</Text>
        </View>
        <Text style={styles.duration}>{meditation.formattedDuration}</Text>
      </View>

      <AudioPlayerControls
        isPlaying={player.status.isPlaying}
        positionSeconds={player.status.positionSeconds}
        durationSeconds={player.status.durationSeconds}
        onTogglePlayPause={player.togglePlayPause}
        onSeek={player.seekTo}
        formatTime={player.formatTime}
      />

      <ScrollView
        style={styles.textContainer}
        contentContainerStyle={styles.textContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>Your Intention</Text>
        <Text style={styles.promptText}>{meditation.prompt}</Text>

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>Meditation Script</Text>
        <Text style={styles.scriptText}>{cleanText}</Text>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  orbContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
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
  duration: {
    ...typography.labelMedium,
    color: colors.textSecondary,
  },
  textContainer: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  textContent: {
    paddingBottom: spacing.huge,
  },
  sectionLabel: {
    ...typography.labelMedium,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
  },
  promptText: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  scriptText: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    lineHeight: 28,
  },
});
