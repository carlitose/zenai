import { Easing } from 'react-native-reanimated';

export const durations = {
  fast: 250,
  normal: 400,
  slow: 700,
  breath: 3000,
  pulse: 2000,
};

export const easings = {
  calm: Easing.bezier(0.4, 0.0, 0.2, 1),
  enter: Easing.out(Easing.cubic),
  exit: Easing.in(Easing.cubic),
  breath: Easing.inOut(Easing.sin),
};
