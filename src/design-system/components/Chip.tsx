import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { radii } from '../tokens/radii';
import { Pressable } from './Pressable';
import { Text } from './Text';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /**
   * solid: ativo = fundo text / texto bg (categorias, tipo de conta)
   * soft: ativo = posSoft / accentText / borda accentText (origem do gasto)
   */
  tone?: 'solid' | 'soft';
  /** ponto colorido à esquerda (cor da categoria) */
  dotColor?: string;
  /** pill (999) ou arredondado (10) */
  shape?: 'pill' | 'rounded';
  height?: number;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/** Chip selecionável (categorias, origens, tipo de conta). */
export function Chip({ label, selected, onPress, tone = 'solid', dotColor, shape = 'pill', height = 36, testID, style }: ChipProps) {
  const { colors } = useTheme();
  const palette = selected
    ? tone === 'solid'
      ? { bg: colors.text, fg: colors.bg, border: colors.text }
      : { bg: colors.posSoft, fg: colors.accentText, border: colors.accentText }
    : { bg: colors.surface, fg: tone === 'solid' ? colors.text : colors.muted, border: colors.line };

  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      haptic="selection"
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={[
        {
          height,
          paddingHorizontal: shape === 'pill' ? 14 : 12,
          borderRadius: shape === 'pill' ? radii.pill : 10,
          borderWidth: 1,
          borderColor: palette.border,
          backgroundColor: palette.bg,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 7,
        },
        style,
      ]}
    >
      {dotColor ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dotColor }} /> : null}
      <Text variant="chip" color={palette.fg} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}
