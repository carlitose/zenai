import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';

interface Props {
  size?: number;
  isActive?: boolean;
}

export function BreathingOrb({ size = 100, isActive = true }: Props) {
  const innerScale = useSharedValue(1);
  const middleScale = useSharedValue(1);
  const outerScale = useSharedValue(1);

  useEffect(() => {
    if (isActive) {
      innerScale.value = withRepeat(
        withTiming(1.2, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
      middleScale.value = withDelay(
        500,
        withRepeat(
          withTiming(1.3, { duration: 3500, easing: Easing.inOut(Easing.sin) }),
          -1,
          true,
        ),
      );
      outerScale.value = withDelay(
        1000,
        withRepeat(
          withTiming(1.4, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
          -1,
          true,
        ),
      );
    } else {
      innerScale.value = withTiming(1, { duration: 700 });
      middleScale.value = withTiming(1, { duration: 700 });
      outerScale.value = withTiming(1, { duration: 700 });
    }
  }, [isActive]);

  const innerSize = size * 0.4;
  const middleSize = size * 0.7;
  const outerSize = size;

  const innerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: innerScale.value }],
  }));

  const middleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: middleScale.value }],
  }));

  const outerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: outerScale.value }],
  }));

  return (
    <View style={[styles.container, { width: size * 1.5, height: size * 1.5 }]}>
      <Animated.View
        style={[
          styles.circle,
          outerStyle,
          {
            width: outerSize,
            height: outerSize,
            borderRadius: outerSize / 2,
            backgroundColor: `${colors.teal}14`,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.circle,
          middleStyle,
          {
            width: middleSize,
            height: middleSize,
            borderRadius: middleSize / 2,
            backgroundColor: `${colors.accent}26`,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.circle,
          innerStyle,
          {
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
            backgroundColor: `${colors.primary}4D`,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  circle: {
    position: 'absolute',
  },
});
