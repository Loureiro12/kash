import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Chip, Icon, PageHeader, Pressable, Screen, SegmentedControl, Text, categoryColors, useTheme } from '@/design-system';
import { formatBRL } from '@/domain/money';
import { DEFAULT_TX_FILTERS, type TxFilters, type TxKindFilter } from '@/domain/selectors/transactions';
import { CATEGORIES } from '@/domain/types';
import { useTransactionsList } from '@/store';
import { TxRow } from './TxRow';

const MIN_MONTH_OFFSET = -11;

/** Lançamentos — lista completa por mês com filtros de tipo e categoria. */
export function TransactionsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [filters, setFilters] = useState<TxFilters>(DEFAULT_TX_FILTERS);
  const { groups, totals, title } = useTransactionsList(filters);
  const set = (patch: Partial<TxFilters>) => setFilters((f) => ({ ...f, ...patch }));

  return (
    <Screen testID="transactions-screen" header={<PageHeader title="Lançamentos" onBack={() => router.back()} testID="transactions" />}>
      {/* Mês */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
        <MonthButton icon="arrow-left" label="Mês anterior" disabled={filters.monthOffset <= MIN_MONTH_OFFSET} onPress={() => set({ monthOffset: filters.monthOffset - 1 })} testID="tx-month-prev" />
        <Text variant="section" testID="tx-month-title" style={{ textTransform: 'capitalize' }}>
          {title}
        </Text>
        <MonthButton icon="chevron-right" label="Próximo mês" disabled={filters.monthOffset >= 0} onPress={() => set({ monthOffset: filters.monthOffset + 1 })} testID="tx-month-next" />
      </View>

      <View style={{ marginTop: 14 }}>
        <SegmentedControl<TxKindFilter>
          value={filters.kind}
          onChange={(kind) => set({ kind, category: kind === 'income' ? null : filters.category })}
          options={[
            { value: 'all', label: 'Tudo', testID: 'tx-kind-all' },
            { value: 'expense', label: 'Gastos', testID: 'tx-filter-expense' },
            { value: 'income', label: 'Entradas', testID: 'tx-filter-income' },
          ]}
        />
      </View>

      {filters.kind !== 'income' ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12, marginHorizontal: -20 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
          <Chip label="Todas" selected={filters.category === null} onPress={() => set({ category: null })} testID="tx-cat-all" />
          {CATEGORIES.map((c) => (
            <Chip key={c} label={c} dotColor={categoryColors[c]} selected={filters.category === c} onPress={() => set({ category: filters.category === c ? null : c })} testID={`tx-cat-${c}`} />
          ))}
        </ScrollView>
      ) : null}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 18 }}>
        <Text variant="meta" color="muted" testID="tx-count">
          {totals.count} {totals.count === 1 ? 'lançamento' : 'lançamentos'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {totals.income > 0 ? (
            <Text variant="chip" color="accentText" testID="tx-total-income">
              + {formatBRL(totals.income)}
            </Text>
          ) : null}
          {totals.spent > 0 ? (
            <Text variant="chip" color="neg" testID="tx-total-spent">
              − {formatBRL(totals.spent)}
            </Text>
          ) : null}
        </View>
      </View>

      {groups.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 40, gap: 6 }} testID="tx-empty">
          <Text variant="titleBold">Nada por aqui</Text>
          <Text variant="body" color="muted" align="center">
            Nenhum lançamento com esses filtros neste mês.
          </Text>
        </View>
      ) : (
        groups.map((g) => (
          <View key={g.date} testID={`tx-day-${g.date}`}>
            <Text variant="eyebrow" color="muted" style={{ marginTop: 20, marginBottom: 2, marginLeft: 4 }}>
              {g.label}
            </Text>
            {g.items.map((t) => (
              <TxRow key={t.id} tx={t} testID={`tx-${t.id}`} />
            ))}
          </View>
        ))
      )}
      <View style={{ height: 1, backgroundColor: colors.bg }} />
    </Screen>
  );
}

function MonthButton({ icon, label, disabled, onPress, testID }: { icon: 'arrow-left' | 'chevron-right'; label: string; disabled: boolean; onPress: () => void; testID: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      haptic="selection"
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.35 : 1 }}
    >
      <Icon name={icon} size={16} color={colors.text} strokeWidth={2.4} />
    </Pressable>
  );
}
