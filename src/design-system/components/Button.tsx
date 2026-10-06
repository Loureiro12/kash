import React from 'react';
import { ActivityIndicator, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { radii } from '../tokens/radii';
import { Pressable } from './Pressable';
import { Text } from './Text';
import type { TextVariant } from '../tokens/typography';

export type ButtonVariant =
  /** verde, texto escuro — CTA principal */
  | 'primary'
  /** outline (borda line, fundo transparente ou surface) */
  | 'secondary'
  /** fundo surface + borda line (ex.: "Sair da conta") */
  | 'surface'
  /** sem fundo */
  | 'ghost'
  /** negSoft/neg (ex.: "Excluir conta") */
  | 'dangerSoft'
  /** fundo neg, texto branco (confirmação destrutiva) */
  | 'danger'
  /** posSoft/accentText (ex.: "+ R$ 50") */
  | 'soft'
  /** tema invertido (onboarding: fundo ink, texto verde) */
  | 'inverse';

export type ButtonSize = 'lg' | 'md' | 'sm' | 'xs';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  /** mostra spinner e bloqueia o toque (mantém o rótulo para leitores de tela) */
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  haptic?: boolean | 'light' | 'medium';
  accessibilityLabel?: string;
}

const sizes: Record<ButtonSize, { height: number; paddingX: number; radius: number; text: TextVariant }> = {
  lg: { height: 56, paddingX: 20, radius: radii.cta, text: 'cta' },
  md: { height: 52, paddingX: 18, radius: radii.cta, text: 'buttonSecondary' },
  sm: { height: 38, paddingX: 12, radius: radii.buttonSm, text: 'chipBold' },
  xs: { height: 36, paddingX: 14, radius: radii.buttonSm, text: 'chip' },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  disabled = false,
  loading = false,
  fullWidth = true,
  style,
  testID,
  haptic = 'light',
  accessibilityLabel,
}: ButtonProps) {
  const { colors } = useTheme();
  const s = sizes[size];
  const blocked = disabled || loading;

  const palette = (() => {
    if (disabled && !loading && (variant === 'primary' || variant === 'danger')) {
      return { bg: colors.surface2, fg: colors.muted, border: 'transparent' };
    }
    switch (variant) {
      case 'primary':
        return { bg: colors.accent, fg: colors.onAccent, border: 'transparent' };
      case 'secondary':
        return { bg: 'transparent', fg: colors.text, border: colors.line };
      case 'surface':
        return { bg: colors.surface, fg: colors.text, border: colors.line };
      case 'ghost':
        return { bg: 'transparent', fg: colors.text, border: 'transparent' };
      case 'dangerSoft':
        return { bg: colors.negSoft, fg: colors.neg, border: 'transparent' };
      case 'danger':
        return { bg: colors.neg, fg: '#FFFFFF', border: 'transparent' };
      case 'soft':
        return { bg: colors.posSoft, fg: colors.accentText, border: 'transparent' };
      case 'inverse':
        return { bg: '#0B0C0E', fg: '#C6F432', border: 'transparent' };
    }
  })();

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={blocked}
      haptic={blocked ? false : haptic}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: blocked, busy: loading }}
      style={[
        styles.base,
        {
          height: s.height,
          paddingHorizontal: s.paddingX,
          borderRadius: s.radius,
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderWidth: palette.border === 'transparent' ? 0 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} testID={testID ? `${testID}-loading` : undefined} />
      ) : (
        <Text variant={s.text} color={palette.fg} numberOfLines={1}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
