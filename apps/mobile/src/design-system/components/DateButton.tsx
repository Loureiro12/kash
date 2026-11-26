import React from 'react';
import { Icon } from '../icons';
import { useTheme } from '../theme';
import { radii } from '../tokens/radii';
import { Pressable } from './Pressable';
import { Text } from './Text';

export interface DateButtonProps {
  /** "Hoje", "Ontem", "12 nov" */
  label: string;
  /** calendário aberto (destaca o botão) */
  open?: boolean;
  onPress: () => void;
  testID?: string;
  accessibilityLabel?: string;
}

/** Botão de data ao lado da descrição: ícone de calendário + rótulo; abre/fecha o calendário. */
export function DateButton({ label, open, onPress, testID = 'date-button', accessibilityLabel }: DateButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      haptic="selection"
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `Data: ${label}`}
      accessibilityHint={open ? 'Fecha o calendário' : 'Abre o calendário'}
      accessibilityState={{ expanded: !!open }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        height: 46,
        paddingHorizontal: 12,
        borderRadius: radii.input,
        borderWidth: 1,
        borderColor: open ? colors.accentText : colors.line,
        backgroundColor: open ? colors.posSoft : colors.surface,
      }}
    >
      <Icon name="calendar" size={16} color={open ? colors.accentText : colors.text} strokeWidth={2.2} />
      <Text variant="bodySemibold" color={open ? 'accentText' : 'text'} numberOfLines={1} testID={`${testID}-label`}>
        {label}
      </Text>
    </Pressable>
  );
}
