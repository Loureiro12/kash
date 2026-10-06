import React from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { radii } from '../tokens/radii';
import { Pressable } from './Pressable';
import { Text } from './Text';

export interface DashedButtonProps {
  label: string;
  onPress?: () => void;
  height?: number;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/** Botão "adicionar" com borda tracejada (+ Adicionar conta, + Nova meta…). */
export function DashedButton({ label, onPress, height = 52, testID, style }: DashedButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      style={[
        {
          height,
          borderRadius: radii.cta,
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: colors.line,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Text variant="bodySemibold" color="muted">
        {label}
      </Text>
    </Pressable>
  );
}
