import React from 'react';
import { View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { radii } from '../tokens/radii';
import { Pressable } from './Pressable';

export interface CardProps extends ViewProps {
  /** surface (default) · accent (verde Kash, tinta escura) · surface2 (bloco interno) */
  variant?: 'surface' | 'accent' | 'surface2';
  radius?: keyof typeof radii;
  /** padding uniforme ou [vertical, horizontal] */
  padding?: number | [number, number];
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  children?: React.ReactNode;
}

/** Card base: surface + borda 1px line + raio 22. Clicável quando recebe onPress. */
export function Card({ variant = 'surface', radius = 'cardLg', padding = 18, onPress, style, testID, children, ...rest }: CardProps) {
  const { colors } = useTheme();
  const pad = Array.isArray(padding) ? { paddingVertical: padding[0], paddingHorizontal: padding[1] } : { padding };
  const base: ViewStyle = {
    borderRadius: radii[radius],
    ...pad,
    ...(variant === 'surface'
      ? { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }
      : variant === 'accent'
        ? { backgroundColor: colors.accent }
        : { backgroundColor: colors.surface2 }),
  };
  if (onPress) {
    return (
      <Pressable onPress={onPress} testID={testID} accessibilityRole="button" pressedOpacity={0.85} style={[base, style]}>
        {children}
      </Pressable>
    );
  }
  return (
    <View {...rest} testID={testID} style={[base, style]}>
      {children}
    </View>
  );
}
