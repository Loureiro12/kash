import React from 'react';
import { ScrollView, View } from 'react-native';
import { Calendar, Chip, SegmentedControl } from '@/design-system';
import { addDays, toISODate, type TxKind } from '@kash/domain';

export type SheetKind = TxKind | 'transfer';

/** Gasto · Entrada · Transferência — o mesmo controle no topo dos dois sheets, para ir e voltar. */
export function TxKindSwitch({ value, onChange }: { value: SheetKind; onChange: (k: SheetKind) => void }) {
  return (
    <SegmentedControl<SheetKind>
      compact
      value={value}
      onChange={onChange}
      options={[
        { value: 'expense', label: 'Gasto', testID: 'tx-kind-expense' },
        { value: 'income', label: 'Entrada', testID: 'tx-kind-income' },
        { value: 'transfer', label: 'Transferência', testID: 'tx-kind-transfer' },
      ]}
      testID="tx-kind"
      style={{ alignSelf: 'flex-start' }}
    />
  );
}

/**
 * Painel de data: atalhos (Hoje, Ontem, Anteontem) e o calendário do mês. Não deixa escolher o futuro.
 * `testID` vira prefixo: `${testID}-hoje`, `${testID}-calendar-day-2026-11-20`…
 */
export function TxDatePicker({ value, today, onPick, testID }: { value: string; today: Date; onPick: (iso: string) => void; testID: string }) {
  const todayISO = toISODate(today);
  const shortcuts = [
    { label: 'Hoje', iso: todayISO, id: 'hoje' },
    { label: 'Ontem', iso: toISODate(addDays(today, -1)), id: 'ontem' },
    { label: 'Anteontem', iso: toISODate(addDays(today, -2)), id: 'anteontem' },
  ];
  return (
    <View style={{ gap: 8 }} testID={testID}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled">
        {shortcuts.map((s) => (
          <Chip key={s.id} label={s.label} tone="soft" height={32} selected={value === s.iso} onPress={() => onPick(s.iso)} testID={`${testID}-${s.id}`} />
        ))}
      </ScrollView>
      <Calendar value={value} onChange={onPick} max={todayISO} today={todayISO} testID={`${testID}-calendar`} />
    </View>
  );
}
