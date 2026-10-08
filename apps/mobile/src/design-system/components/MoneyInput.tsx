import { formatBRL, moneyFromTyped } from '@kash/domain';
import React, { forwardRef } from 'react';
import { type TextInput } from 'react-native';
import { Input, type InputProps } from './Input';

export interface MoneyInputProps extends Omit<InputProps, 'value' | 'onChangeText' | 'keyboardType' | 'inputMode' | 'trailingAction'> {
  /** valor em reais (0 = vazio, mostra o placeholder) */
  value: number;
  onChangeValue: (value: number) => void;
  /** mostra o botão ± para valores negativos (ex.: saldo no cheque especial) */
  allowNegative?: boolean;
}

/** Texto exibido no campo: vazio para 0, "R$ 1.234,56" ou "-R$ 50,00". */
export function maskedMoney(value: number): string {
  if (value === 0) return '';
  return `${value < 0 ? '-' : ''}${formatBRL(value)}`;
}

/**
 * Campo de dinheiro com máscara: o usuário digita só números, que entram pelos centavos
 * (1 → R$ 0,01 · 1250 → R$ 12,50), e o campo mostra sempre o valor formatado. O cursor fica
 * no fim, então apagar tira o último dígito. Com `allowNegative`, o botão ± troca o sinal.
 */
export const MoneyInput = forwardRef<TextInput, MoneyInputProps>(function MoneyInput(
  { value, onChangeValue, allowNegative, placeholder = 'R$ 0,00', accessibilityHint, testID, ...rest },
  ref,
) {
  const text = maskedMoney(value);
  const negative = value < 0;
  return (
    <Input
      ref={ref}
      {...rest}
      testID={testID}
      value={text}
      placeholder={placeholder}
      onChangeText={(typed) => {
        const abs = moneyFromTyped(typed);
        onChangeValue(negative ? -abs : abs);
      }}
      keyboardType="number-pad"
      inputMode="numeric"
      selection={{ start: text.length, end: text.length }}
      accessibilityHint={accessibilityHint ?? 'Digite só os números; os dois últimos são os centavos'}
      trailingAction={
        allowNegative
          ? { label: negative ? 'Tornar positivo' : 'Tornar negativo', icon: 'plus-minus', onPress: () => onChangeValue(-value), testID: testID ? `${testID}-sign` : undefined }
          : undefined
      }
    />
  );
});
