import React, { forwardRef, useRef } from 'react';
import { TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { radii } from '../tokens/radii';
import { textVariants } from '../tokens/typography';
import { useSheetScroll } from './BottomSheet';
import { Text } from './Text';

export interface InputProps extends TextInputProps {
  label?: string;
  /** 52 (login) · 48 (sheets) · 46 (descrição do gasto) */
  height?: 52 | 48 | 46;
  containerStyle?: StyleProp<ViewStyle>;
  /** label menor com padding (sheets) */
  labelSize?: 'md' | 'sm';
}

/** Campo de texto padrão: surface, borda line, raio 14. */
export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, height = 48, containerStyle, labelSize = 'md', style, onFocus, ...rest },
  ref,
) {
  const { colors } = useTheme();
  const sheet = useSheetScroll();
  const inner = useRef<TextInput | null>(null);
  const setRefs = (node: TextInput | null) => {
    inner.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };
  return (
    <View style={[{ gap: labelSize === 'md' ? 6 : 5 }, containerStyle]}>
      {label ? (
        <Text variant={labelSize === 'md' ? 'metaMedium' : 'microMedium'} color="muted" style={labelSize === 'sm' ? { paddingLeft: 4 } : null}>
          {label}
        </Text>
      ) : null}
      <TextInput
        ref={setRefs}
        placeholderTextColor={colors.muted}
        selectionColor={colors.accent}
        onFocus={(e) => {
          sheet?.ensureVisible(inner.current); // dentro de um sheet, rola o campo para a área visível
          onFocus?.(e);
        }}
        {...rest}
        style={[
          {
            height,
            borderRadius: radii.input,
            borderWidth: 1,
            borderColor: colors.line,
            backgroundColor: colors.surface,
            color: colors.text,
            paddingHorizontal: height === 52 ? 16 : 14,
            fontFamily: textVariants.input.fontFamily,
            fontSize: height === 52 ? 15 : 14,
            minWidth: 0,
          },
          style,
        ]}
      />
    </View>
  );
});
