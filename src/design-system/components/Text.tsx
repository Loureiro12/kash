import React from 'react';
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { useTheme } from '../theme';
import { textVariants, type TextVariant } from '../tokens/typography';
import type { SemanticColors } from '../tokens/colors';

export type TextColor = keyof SemanticColors | (string & {});

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  /** nome de token semântico (ex.: 'muted') ou cor literal */
  color?: TextColor;
  align?: TextStyle['textAlign'];
  opacity?: number;
  children?: React.ReactNode;
}

/**
 * Texto tipográfico do Kash. Sempre usa Sora e um `variant` do token set.
 */
export function Text({
  variant = 'body',
  color = 'text',
  align,
  opacity,
  style,
  children,
  ...rest
}: TextProps) {
  const { colors } = useTheme();
  const resolved = (colors as unknown as Record<string, string>)[color] ?? color;
  return (
    <RNText
      {...rest}
      style={[textVariants[variant], { color: resolved }, align ? { textAlign: align } : null, opacity !== undefined ? { opacity } : null, style]}
    >
      {children}
    </RNText>
  );
}
