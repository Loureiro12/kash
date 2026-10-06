import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme';
import { Icon } from '../icons';
import { radii } from '../tokens/radii';
import { Chip } from './Chip';
import { Pressable } from './Pressable';
import { Text } from './Text';

export interface DateStepperProps {
  /** rótulo da data atual (ex.: "Hoje", "02 out") */
  label: string;
  onPrev: () => void;
  onNext: () => void;
  /** desabilita avançar (ex.: já é hoje) */
  nextDisabled?: boolean;
  /** atalho "Hoje" quando a data não é hoje */
  onToday?: () => void;
  isToday: boolean;
  testID?: string;
  /** versão estreita para dividir a linha com outro campo */
  compact?: boolean;
}

/** Seletor de data compacto: ‹ data › com atalho "Hoje". Não permite datas futuras. */
export function DateStepper({ label, onPrev, onNext, nextDisabled, onToday, isToday, testID = 'date-stepper', compact }: DateStepperProps) {
  const { colors } = useTheme();
  return (
    <View testID={testID} style={{ flexDirection: 'row', alignItems: 'center', gap: compact ? 2 : 8, height: 46, paddingHorizontal: compact ? 2 : 6, borderRadius: radii.input, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}>
      <Pressable onPress={onPrev} testID={`${testID}-prev`} haptic="selection" accessibilityRole="button" accessibilityLabel="Dia anterior" style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="arrow-left" size={16} color={colors.text} strokeWidth={2.4} />
      </Pressable>
      <Text variant="bodySemibold" style={compact ? { minWidth: 52 } : { flex: 1 }} align="center" numberOfLines={1} testID={`${testID}-label`}>
        {label}
      </Text>
      {!isToday && onToday && !compact ? <Chip label="Hoje" tone="soft" height={30} onPress={onToday} testID={`${testID}-today`} /> : null}
      <Pressable
        onPress={onNext}
        disabled={nextDisabled}
        testID={`${testID}-next`}
        haptic="selection"
        accessibilityRole="button"
        accessibilityLabel="Próximo dia"
        accessibilityState={{ disabled: !!nextDisabled }}
        style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', opacity: nextDisabled ? 0.3 : 1 }}
      >
        <Icon name="chevron-right" size={18} color={colors.text} strokeWidth={2.4} />
      </Pressable>
    </View>
  );
}
