import React, { forwardRef, useRef, useState } from 'react';
import { Pressable, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { Icon, type IconName } from '../icons';
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
  /** mensagem de erro: borda e texto em `neg` */
  error?: string | null;
  /** ação dentro do campo, à direita (ex.: trocar sinal). Ignorada em campos de senha, que já têm o olho. */
  trailingAction?: { label: string; icon: IconName; onPress: () => void; testID?: string };
}

/** Campo de texto padrão: surface, borda line, raio 14. Com `secureTextEntry`, ganha o olho de mostrar/ocultar. */
export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, height = 48, containerStyle, labelSize = 'md', style, onFocus, error, testID, secureTextEntry, trailingAction, ...rest },
  ref,
) {
  const { colors } = useTheme();
  const [revealed, setRevealed] = useState(false);
  const toggleSize = height === 52 ? 44 : 40;
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
      <View>
      <TextInput
        ref={setRefs}
        secureTextEntry={secureTextEntry && !revealed}
        placeholderTextColor={colors.muted}
        selectionColor={colors.accent}
        onFocus={(e) => {
          sheet?.ensureVisible(inner.current); // dentro de um sheet, rola o campo para a área visível
          onFocus?.(e);
        }}
        {...rest}
        testID={testID}
        accessibilityState={{ ...(rest.accessibilityState ?? {}) }}
        accessibilityHint={error ?? rest.accessibilityHint}
        style={[
          {
            height,
            borderRadius: radii.input,
            borderWidth: 1,
            borderColor: error ? colors.neg : colors.line,
            backgroundColor: colors.surface,
            color: colors.text,
            paddingHorizontal: height === 52 ? 16 : 14,
            paddingRight: secureTextEntry || trailingAction ? toggleSize + 6 : undefined,
            fontFamily: textVariants.input.fontFamily,
            fontSize: height === 52 ? 15 : 14,
            minWidth: 0,
          },
          style,
        ]}
      />
      {secureTextEntry ? (
        <Pressable
          onPress={() => setRevealed((v) => !v)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={revealed ? 'Ocultar senha' : 'Mostrar senha'}
          testID={testID ? `${testID}-toggle` : undefined}
          style={({ pressed }) => ({ position: 'absolute', right: 2, top: (height - toggleSize) / 2, width: toggleSize, height: toggleSize, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}
        >
          <Icon name={revealed ? 'eye-off' : 'eye'} size={height === 52 ? 20 : 18} color={colors.muted} />
        </Pressable>
      ) : trailingAction ? (
        <Pressable
          onPress={trailingAction.onPress}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={trailingAction.label}
          testID={trailingAction.testID}
          style={({ pressed }) => ({ position: 'absolute', right: 2, top: (height - toggleSize) / 2, width: toggleSize, height: toggleSize, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}
        >
          <Icon name={trailingAction.icon} size={height === 52 ? 20 : 18} color={colors.muted} />
        </Pressable>
      ) : null}
      </View>
      {error ? (
        <Text variant="meta" color="neg" testID={testID ? `${testID}-error` : undefined}>
          {error}
        </Text>
      ) : null}
    </View>
  );
});
