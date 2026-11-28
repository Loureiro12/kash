import { calendarMonthGrid, MONTH_NAMES, parseISODate, shiftMonthKey, spokenDate } from '@kash/domain';
import React, { useState } from 'react';
import { View } from 'react-native';
import { Icon } from '../icons';
import { useTheme } from '../theme';
import { radii } from '../tokens/radii';
import { Pressable } from './Pressable';
import { Text } from './Text';

const WEEK = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export interface CalendarProps {
  /** dia escolhido (yyyy-mm-dd) */
  value: string;
  onChange: (iso: string) => void;
  /** último dia permitido (ex.: hoje); dias depois ficam apagados */
  max?: string;
  /** primeiro dia permitido (ex.: hoje, para datas futuras); dias antes ficam apagados */
  min?: string;
  /** destaca com contorno (ex.: hoje) */
  today?: string;
  testID?: string;
}

/** Calendário mensal (domingo a sábado) com ‹ mês › para navegar. */
export function Calendar({ value, onChange, max, min, today, testID = 'calendar' }: CalendarProps) {
  const { colors } = useTheme();
  const [month, setMonth] = useState(value.slice(0, 7));
  const maxMonth = max?.slice(0, 7);
  const nextDisabled = !!maxMonth && month >= maxMonth;
  const minMonth = min?.slice(0, 7);
  const prevDisabled = !!minMonth && month <= minMonth;
  const d = parseISODate(`${month}-01`);
  const title = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
  const weeks = calendarMonthGrid(month);

  return (
    <View testID={testID} style={{ gap: 6, padding: 10, borderRadius: radii.input, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <NavButton icon="arrow-left" label="Mês anterior" disabled={prevDisabled} onPress={() => setMonth((m) => shiftMonthKey(m, -1))} testID={`${testID}-prev`} />
        <Text variant="bodySemibold" align="center" style={{ flex: 1, textTransform: 'capitalize' }} testID={`${testID}-month`} accessibilityRole="header">
          {title}
        </Text>
        <NavButton icon="chevron-right" label="Próximo mês" disabled={nextDisabled} onPress={() => setMonth((m) => shiftMonthKey(m, 1))} testID={`${testID}-next`} />
      </View>
      <View style={{ flexDirection: 'row' }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {WEEK.map((w, i) => (
          <Text key={i} variant="microMedium" color="muted" align="center" style={{ flex: 1 }}>
            {w}
          </Text>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={{ flexDirection: 'row' }}>
          {week.map((iso, di) => {
            if (!iso) return <View key={di} style={{ flex: 1, height: 38 }} />;
            const selected = iso === value;
            const disabled = (!!max && iso > max) || (!!min && iso < min);
            const isToday = iso === today;
            return (
              <View key={iso} style={{ flex: 1, alignItems: 'center' }}>
                <Pressable
                  onPress={() => onChange(iso)}
                  disabled={disabled}
                  haptic="selection"
                  testID={`${testID}-day-${iso}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${spokenDate(iso)}${isToday ? ', hoje' : ''}`}
                  accessibilityState={{ selected, disabled }}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: selected ? colors.accent : 'transparent',
                    borderWidth: isToday && !selected ? 1 : 0,
                    borderColor: colors.accentText,
                    opacity: disabled ? 0.3 : 1,
                  }}
                >
                  <Text variant={selected || isToday ? 'bodyBold' : 'body'} color={selected ? 'onAccent' : 'text'}>
                    {Number(iso.slice(8))}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function NavButton({ icon, label, onPress, disabled, testID }: { icon: 'arrow-left' | 'chevron-right'; label: string; onPress: () => void; disabled?: boolean; testID: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      haptic="selection"
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.3 : 1 }}
    >
      <Icon name={icon} size={icon === 'arrow-left' ? 16 : 18} color={colors.text} strokeWidth={2.4} />
    </Pressable>
  );
}
