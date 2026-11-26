import { formatBRL, moneyFromTyped } from '@kash/domain';
import React, { forwardRef, useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useTheme } from '../theme';
import { Text, type TextColor } from './Text';

export interface AmountFieldProps {
  /** valor em reais (sempre positivo) */
  value: number;
  onChangeValue: (value: number) => void;
  /** cor do valor quando > 0 (ex.: accentText numa entrada) */
  color?: TextColor;
  /** texto antes do valor quando > 0 (ex.: "+ ") */
  prefix?: string;
  /** testID do valor exibido; o campo de digitação recebe `${testID}-input` */
  testID?: string;
  accessibilityLabel?: string;
  onFocus?: () => void;
}

/**
 * Valor grande do sheet, digitado no teclado numérico do sistema (sem teclado próprio na tela).
 * Os números entram pelos centavos, como numa maquininha: 1 → R$ 0,01 · 1450 → R$ 14,50; apagar tira o último.
 * O texto grande é só a exibição: um campo transparente por cima recebe o toque e o teclado.
 */
export const AmountField = forwardRef<TextInput, AmountFieldProps>(function AmountField(
  { value, onChangeValue, color = 'text', prefix = '', testID = 'amount', accessibilityLabel = 'Valor', onFocus },
  ref,
) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const text = value > 0 ? formatBRL(value) : '';
  const caret = useSharedValue(0);

  useEffect(() => {
    if (focused) caret.value = withRepeat(withSequence(withTiming(1, { duration: 80 }), withTiming(1, { duration: 450 }), withTiming(0, { duration: 80 }), withTiming(0, { duration: 390 })), -1);
    else {
      cancelAnimation(caret);
      caret.value = 0;
    }
  }, [focused, caret]);
  const caretStyle = useAnimatedStyle(() => ({ opacity: caret.value }));

  return (
    <View style={styles.wrap}>
      {/* só exibição: o leitor de tela lê o campo abaixo (que já fala o valor) */}
      <View style={styles.row} pointerEvents="none">
        <Text variant="amountSheet" color={value > 0 ? color : 'muted'} testID={testID} numberOfLines={1} adjustsFontSizeToFit accessible={false}>
          {value > 0 ? prefix : ''}
          {formatBRL(value)}
        </Text>
        <Animated.View style={[styles.caret, { backgroundColor: colors.accent }, caretStyle]} />
      </View>
      <TextInput
        ref={ref}
        testID={`${testID}-input`}
        value={text}
        onChangeText={(typed) => onChangeValue(moneyFromTyped(typed))}
        keyboardType="number-pad"
        inputMode="numeric"
        selection={{ start: text.length, end: text.length }}
        caretHidden
        contextMenuHidden
        onFocus={() => {
          setFocused(true);
          onFocus?.();
        }}
        onBlur={() => setFocused(false)}
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ text: formatBRL(value) }}
        accessibilityHint="Digite só os números; os dois últimos são os centavos"
        style={[StyleSheet.absoluteFill, styles.input]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 2, minHeight: 52 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 3, maxWidth: '100%' },
  caret: { width: 3, height: 36, borderRadius: 2 },
  // invisível, mas recebe toques e o teclado
  input: { color: 'transparent', backgroundColor: 'transparent', fontSize: 1, textAlign: 'center' },
});
