import React from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { Icon, type IconName } from '../icons';
import { Pressable } from './Pressable';

export interface IconButtonProps {
  icon: IconName;
  onPress?: () => void;
  /** 40 = botão redondo padrão (voltar, olho) · 32 = fechar sheet */
  size?: 40 | 32;
  accessibilityLabel: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  /** sem borda, fundo surface, ícone muted (botão × dos sheets) */
  subtle?: boolean;
}

/** Botão redondo com ícone (voltar, ocultar valores, fechar). */
export function IconButton({ icon, onPress, size = 40, accessibilityLabel, testID, style, subtle }: IconButtonProps) {
  const { colors } = useTheme();
  const iconSize = size === 40 ? 18 : 16;
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.surface,
          borderWidth: subtle ? 0 : 1,
          borderColor: colors.line,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Icon name={icon} size={iconSize} color={subtle ? colors.muted : colors.text} strokeWidth={icon === 'arrow-left' ? 2.4 : 2} />
    </Pressable>
  );
}
