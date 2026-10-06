import React, { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '../theme';
import { motion } from '../tokens/motion';

export interface ProgressBarProps {
  /** 0..100 */
  pct: number;
  height?: 6 | 8 | 10;
  trackColor?: string;
  fillColor?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Barra horizontal com animação de largura (400ms). */
export function ProgressBar({ pct, height = 8, trackColor, fillColor, style, testID }: ProgressBarProps) {
  const { colors } = useTheme();
  const width = useSharedValue(Math.max(0, Math.min(100, pct)));

  useEffect(() => {
    width.value = withTiming(Math.max(0, Math.min(100, pct)), { duration: motion.duration.progress });
  }, [pct, width]);

  const fill = useAnimatedStyle(() => ({ width: `${width.value}%` }));

  return (
    <View
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
      style={[{ height, borderRadius: 99, backgroundColor: trackColor ?? colors.surface2, overflow: 'hidden' }, style]}
    >
      <Animated.View style={[{ height: '100%', borderRadius: 99, backgroundColor: fillColor ?? colors.accent }, fill]} />
    </View>
  );
}
