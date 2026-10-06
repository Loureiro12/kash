import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme';
import { Icon } from '../icons';

export interface CheckCircleProps {
  checked: boolean;
  /** circle: 26px redondo verde (contas fixas) · square: 24px r7 vermelho (confirmar exclusão) */
  shape?: 'circle' | 'square';
  testID?: string;
}

/** Indicador de check (não é clicável sozinho; o pai controla o toque). */
export function CheckCircle({ checked, shape = 'circle', testID }: CheckCircleProps) {
  const { colors } = useTheme();
  const isCircle = shape === 'circle';
  const size = isCircle ? 26 : 24;
  const activeColor = isCircle ? colors.accent : colors.neg;
  return (
    <View
      testID={testID}
      accessibilityState={{ checked }}
      style={{
        width: size,
        height: size,
        borderRadius: isCircle ? size / 2 : 7,
        borderWidth: 2,
        borderColor: checked ? activeColor : colors.muted,
        backgroundColor: checked ? activeColor : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {checked ? <Icon name="check" size={13} color={isCircle ? '#0B0C0E' : '#FFFFFF'} strokeWidth={3.5} /> : null}
    </View>
  );
}
