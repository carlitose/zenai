import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { shadows } from '../theme/shadows';

interface Props {
  isPlaying: boolean;
  positionSeconds: number;
  durationSeconds: number;
  onTogglePlayPause: () => void;
  onSeek: (seconds: number) => void;
  formatTime: (seconds: number) => string;
}

export function AudioPlayerControls({
  isPlaying,
  positionSeconds,
  durationSeconds,
  onTogglePlayPause,
  onSeek,
  formatTime,
}: Props) {
  const progress = durationSeconds > 0 ? positionSeconds / durationSeconds : 0;
  const [barWidth, setBarWidth] = useState(0);
  const [isTouching, setIsTouching] = useState(false);

  const handleBarLayout = (e: LayoutChangeEvent) => {
    setBarWidth(e.nativeEvent.layout.width);
  };

  const handleBarPress = (e: any) => {
    if (barWidth > 0 && durationSeconds > 0) {
      const x = e.nativeEvent.locationX;
      const seekPosition = (x / barWidth) * durationSeconds;
      onSeek(Math.max(0, Math.min(seekPosition, durationSeconds)));
    }
  };

  const handlePlayPause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onTogglePlayPause();
  };

  const handleSkipBack = () => {
    onSeek(Math.max(0, positionSeconds - 15));
  };

  const handleSkipForward = () => {
    onSeek(Math.min(durationSeconds, positionSeconds + 30));
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.progressBarContainer}
        onPress={handleBarPress}
        onLayout={handleBarLayout}
        onPressIn={() => setIsTouching(true)}
        onPressOut={() => setIsTouching(false)}
      >
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]}>
            {isTouching && <View style={styles.seekThumb} />}
          </View>
        </View>
      </Pressable>

      <View style={styles.timeRow}>
        <Text style={styles.time}>{formatTime(positionSeconds)}</Text>
        <Text style={styles.time}>{formatTime(durationSeconds)}</Text>
      </View>

      <View style={styles.controlsRow}>
        <TouchableOpacity onPress={handleSkipBack} style={styles.skipButton}>
          <Ionicons name="play-back" size={24} color={colors.textSecondary} />
          <Text style={styles.skipLabel}>15</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.playButton, isPlaying && styles.playButtonActive]}
          onPress={handlePlayPause}
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={32}
            color={colors.textOnPrimary}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSkipForward} style={styles.skipButton}>
          <Ionicons name="play-forward" size={24} color={colors.textSecondary} />
          <Text style={styles.skipLabel}>30</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  progressBarContainer: {
    width: '100%',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  progressTrack: {
    height: 4,
    backgroundColor: colors.surfaceHighlight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  seekThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.white,
    position: 'absolute',
    right: -8,
    top: -6,
    ...shadows.sm,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xs,
  },
  time: {
    ...typography.labelMedium,
    color: colors.textMuted,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
    gap: spacing.xxl,
  },
  skipButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipLabel: {
    ...typography.labelSmall,
    color: colors.textMuted,
    marginTop: spacing.xxs,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  playButtonActive: {
    ...shadows.glow,
  },
});
