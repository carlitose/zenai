import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme';
import { AudioPlayerControls } from '../components/AudioPlayerControls';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { RootStackParamList } from '../navigation/types';
import { MeditationTypeLabels, MeditationType } from '../../domain/value-objects/MeditationType';

type Route = RouteProp<RootStackParamList, 'Player'>;

export function PlayerScreen() {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const { meditation } = route.params;
  const player = useAudioPlayer();

  useEffect(() => {
    const segmentsPath = `${meditation.audioDirectoryPath}segments.json`;
    player.load(segmentsPath);
    return () => {
      player.unload();
    };
  }, []);

  const typeLabel =
    MeditationTypeLabels[meditation.type as MeditationType] ?? meditation.type;

  // Clean text for display: remove markers
  const cleanText = meditation.generatedText
    .replace(/\[SILENT\s+\d+s?\]/gi, '\n~ ~ ~\n')
    .replace(/\[DONG\]/gi, '\n~ ~ ~\n')
    .trim();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-down" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Player</Text>
        <View style={{ width: 28 }} />
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

      <ScrollView style={styles.textContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.promptLabel}>Prompt</Text>
        <Text style={styles.promptText}>{meditation.prompt}</Text>
        <Text style={styles.scriptLabel}>Script</Text>
        <Text style={styles.scriptText}>{cleanText}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    ...typography.h3,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  badge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    ...typography.small,
    color: colors.white,
    fontWeight: '600',
  },
  duration: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  textContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  promptLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  promptText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  scriptLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  scriptText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 26,
    paddingBottom: spacing.xxl,
  },
});
