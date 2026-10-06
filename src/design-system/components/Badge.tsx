import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { radii } from '../tokens/radii';
import { Text } from './Text';

export interface BadgeProps {
  label: string;
  /** pos: posSoft/accentText · neg: negSoft/neg · neutral: surface2/muted */
  tone?: 'pos' | 'neg' | 'neutral';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Pílula informativa (↑ entrou / ↓ saiu). */
export function Badge({ label, tone = 'neutral', style, testID }: BadgeProps) {
  const { colors } = useTheme();
  const palette =
    tone === 'pos'
      ? { bg: colors.posSoft, fg: colors.accentText }
      : tone === 'neg'
        ? { bg: colors.negSoft, fg: colors.neg }
        : { bg: colors.surface2, fg: colors.muted };
  return (
    <View
      testID={testID}
      style={[{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: radii.pill, backgroundColor: palette.bg, alignSelf: 'flex-start' }, style]}
    >
      <Text variant="chip" color={palette.fg} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}
