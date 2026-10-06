import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '../theme';
import { motion } from '../tokens/motion';
import { shadows } from '../tokens/shadows';
import { Pressable } from './Pressable';

export interface SwitchProps {
  value: boolean;
  onValueChange?: (next: boolean) => void;
  testID?: string;
  accessibilityLabel?: string;
}

/** Switch 44×26 com knob 20px; ativo verde, 200ms. */
export function Switch({ value, onValueChange, testID, accessibilityLabel }: SwitchProps) {
  const { colors } = useTheme();
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, { duration: motion.duration.fast });
  }, [value, progress]);

  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: 3 + progress.value * 18 }] }));

  return (
    <Pressable
      testID={testID}
      onPress={() => onValueChange?.(!value)}
      haptic="selection"
      pressedOpacity={0.9}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value }}
      hitSlop={8}
      style={{ width: 44, height: 26, borderRadius: 99, backgroundColor: value ? colors.accent : colors.surface2, justifyContent: 'center' }}
    >
      <Animated.View style={[{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' }, shadows.knob, knobStyle]} />
      <View />
    </Pressable>
  );
}
