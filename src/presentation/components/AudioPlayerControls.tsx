import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme';

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
  const [barWidth, setBarWidth] = React.useState(0);

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

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.progressBarContainer}
        onPress={handleBarPress}
        onLayout={handleBarLayout}
      >
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </Pressable>

      <View style={styles.timeRow}>
        <Text style={styles.time}>{formatTime(positionSeconds)}</Text>
        <Text style={styles.time}>{formatTime(durationSeconds)}</Text>
      </View>

      <TouchableOpacity style={styles.playButton} onPress={onTogglePlayPause}>
        <Ionicons
          name={isPlaying ? 'pause' : 'play'}
          size={40}
          color={colors.white}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  progressBarContainer: {
    width: '100%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  progressTrack: {
    height: 4,
    backgroundColor: colors.surfaceLight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
  time: {
    ...typography.small,
    color: colors.textSecondary,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
});
