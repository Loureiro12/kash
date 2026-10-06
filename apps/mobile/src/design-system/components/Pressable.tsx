import * as Haptics from 'expo-haptics';
import React, { useCallback } from 'react';
import {
  Pressable as RNPressable,
  Platform,
  type GestureResponderEvent,
  type PressableProps as RNPressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

export interface PressableProps extends Omit<RNPressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** opacidade ao pressionar (default .7) */
  pressedOpacity?: number;
  /** feedback tátil leve ao tocar */
  haptic?: boolean | 'light' | 'medium' | 'selection';
}

/**
 * Pressable padrão: feedback de opacidade + haptics opcionais.
 * Toda interação de toque do app passa por aqui para manter comportamento uniforme.
 */
export function Pressable({ style, pressedOpacity = 0.7, haptic, onPress, disabled, ...rest }: PressableProps) {
  const handlePress = useCallback(
    (e: GestureResponderEvent) => {
      if (haptic && Platform.OS !== 'web') {
        if (haptic === 'selection') {
          void Haptics.selectionAsync();
        } else {
          void Haptics.impactAsync(
            haptic === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
          );
        }
      }
      onPress?.(e);
    },
    [haptic, onPress],
  );

  return (
    <RNPressable
      {...rest}
      disabled={disabled}
      onPress={handlePress}
      style={({ pressed }) => [style, pressed && !disabled ? { opacity: pressedOpacity } : null]}
    />
  );
}
