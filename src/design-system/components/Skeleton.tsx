import React, { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useTheme } from '../theme';
import { radii } from '../tokens/radii';

export interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/** Bloco de carregamento com pulso suave (surface2 → surface). */
export function Skeleton({ width = '100%', height = 16, radius = radii.sm, style }: SkeletonProps) {
  const { colors } = useTheme();
  const pulse = useSharedValue(0.6);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [pulse]);
  const anim = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return <Animated.View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[{ width, height, borderRadius: radius, backgroundColor: colors.surface2 }, anim, style]} />;
}

/** Esqueleto genérico de tela: título, card grande, três blocos e linhas de lista. */
export function ScreenSkeleton({ testID = 'skeleton' }: { testID?: string }) {
  return (
    <View testID={testID} style={{ gap: 12, marginTop: 10 }}>
      <Skeleton width="55%" height={26} radius={8} />
      <Skeleton height={132} radius={radii.cardXl} style={{ marginTop: 10 }} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Skeleton height={84} radius={radii.card} style={{ flex: 1 }} />
        <Skeleton height={84} radius={radii.card} style={{ flex: 1 }} />
        <Skeleton height={84} radius={radii.card} style={{ flex: 1 }} />
      </View>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
          <Skeleton width={40} height={40} radius={radii.icon} />
          <View style={{ flex: 1, gap: 6 }}>
            <Skeleton width="60%" height={14} />
            <Skeleton width="40%" height={12} />
          </View>
          <Skeleton width={64} height={14} />
        </View>
      ))}
    </View>
  );
}
