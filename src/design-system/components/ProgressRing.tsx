import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../theme';
import { motion } from '../tokens/motion';
import { Text } from './Text';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface ProgressRingProps {
  /** 0..100 */
  pct: number;
  color: string;
  size?: number;
  strokeWidth?: number;
  testID?: string;
}

/** Anel de progresso (metas): 68px, raio 28, stroke 7, round cap, −90°. */
export function ProgressRing({ pct, color, size = 68, strokeWidth = 7, testID }: ProgressRingProps) {
  const { colors } = useTheme();
  const r = (size - strokeWidth * 2 + 2) / 2 - 1; // 68 → 28
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const progress = useSharedValue(clamped);

  useEffect(() => {
    progress.value = withTiming(clamped, { duration: motion.duration.progress });
  }, [clamped, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDasharray: `${(circumference * progress.value) / 100} ${circumference}`,
    // com round cap, um traço de comprimento zero ainda desenha um ponto — esconde em 0%
    strokeOpacity: progress.value > 0 ? 1 : 0,
  }));

  return (
    <View testID={testID} style={{ width: size, height: size }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={c} cy={c} r={r} fill="none" stroke={colors.surface2} strokeWidth={strokeWidth} />
        <AnimatedCircle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          animatedProps={animatedProps}
          transform={`rotate(-90 ${c} ${c})`}
        />
      </Svg>
      <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Text variant="bodyBold">{Math.round(clamped)}%</Text>
      </View>
    </View>
  );
}
