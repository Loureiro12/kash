import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { Card, PageHeader, Pressable, Screen, Text, useTheme } from '@/design-system';
import { forecastHeights, forecastSelection, formatBRL } from '@kash/domain';
import { useForecast, useKashStore } from '@/store';

/** Tela 8 — Previsão (página interna). Tocar num mês recalcula o cartão: total, divisão, limite e acumulado. */
export function ForecastScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const budget = useKashStore((s) => s.settings.monthlyBudget);
  const months = useForecast();
  const heights = forecastHeights(months, 8);
  const [selected, setSelected] = useState(1);
  const summary = forecastSelection(months, selected, budget);
  const first = months[0];

  return (
    <Screen testID="forecast-screen" header={<PageHeader title="Previsão" onBack={() => router.back()} testID="forecast" />}>
      <Text variant="body" color="muted">
        Quanto já está comprometido nos próximos meses com contas fixas e parcelas do cartão. Toque num mês pra ver o total dele.
      </Text>

      {summary && first ? (
        <>
          <Card padding={20} style={{ marginTop: 18 }} testID="forecast-summary">
            <Text variant="meta" color="muted" testID="forecast-month-heading">
              Comprometido em {summary.month.name}
            </Text>
            <Text variant="amountLarge" style={{ marginTop: 2 }} testID="forecast-month-total" accessibilityLiveRegion="polite">
              {formatBRL(summary.month.total)}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 6 }}>
              <Legend color={colors.accent} label={`Parcelas ${formatBRL(summary.month.installments)}`} testID="forecast-month-installments" />
              <Legend color={colors.muted} label={`Contas fixas ${formatBRL(summary.month.bills)}`} testID="forecast-month-bills" />
            </View>
            {budget > 0 ? (
              <Text variant="meta" color={summary.leftover >= 0 ? 'muted' : 'neg'} style={{ marginTop: 8 }} testID="forecast-month-budget">
                {summary.pctOfBudget}% do seu limite de {formatBRL(budget)} ·{' '}
                {summary.leftover >= 0 ? `sobram ${formatBRL(summary.leftover)}` : `passa ${formatBRL(-summary.leftover)}`}
              </Text>
            ) : null}

            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 140, marginTop: 18 }} testID="forecast-chart">
              {months.map((m, i) => {
                const active = selected === m.offset;
                return (
                  <Pressable
                    key={m.offset}
                    onPress={() => setSelected(m.offset)}
                    testID={`forecast-month-${m.offset}`}
                    haptic="selection"
                    pressedOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`${m.name}: ${formatBRL(m.total)}`}
                    style={{ flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}
                  >
                    {active ? (
                      <Text variant="microSemibold" numberOfLines={1} adjustsFontSizeToFit style={{ maxWidth: '140%' }}>
                        {formatBRL(m.total).replace('R$ ', '')}
                      </Text>
                    ) : null}
                    <View style={{ width: '100%', height: `${(heights[i] ?? 8) * 0.82}%`, borderRadius: 8, overflow: 'hidden', opacity: active ? 1 : 0.45 }}>
                      <View style={{ flex: m.installments, backgroundColor: colors.accent }} />
                      <View style={{ flex: m.bills, backgroundColor: colors.muted }} />
                    </View>
                    <Text variant="microSemibold" color={active ? 'text' : 'muted'}>
                      {m.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.line, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
              <Text variant="meta" color="muted" style={{ flex: 1 }} testID="forecast-cumulative-label">
                {summary.monthsCounted > 1 ? `Acumulado de ${first.name} a ${summary.month.name}` : `Acumulado em ${first.name}`}
              </Text>
              <Text variant="bodyBold" testID="forecast-cumulative">
                {formatBRL(summary.cumulative)}
              </Text>
            </View>
          </Card>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 24 }}>
            <Text variant="section" testID="forecast-selected-title">
              Em {summary.month.name}
            </Text>
            <Text variant="meta" color="muted" testID="forecast-selected-count">
              {summary.month.items.length} {summary.month.items.length === 1 ? 'compromisso' : 'compromissos'}
            </Text>
          </View>
          <View style={{ marginTop: 6 }} testID="forecast-items">
            {summary.month.items.map((item) => (
              <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: item.kind === 'installment' ? colors.posSoft : colors.surface2,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text variant="microBold" color={item.kind === 'installment' ? 'accentText' : 'muted'}>
                    {item.tag}
                  </Text>
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Text variant="title" numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text variant="meta" color="muted">
                    {item.subtitle}
                  </Text>
                </View>
                <Text variant="value">{formatBRL(item.amount)}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

function Legend({ color, label, testID }: { color: string; label: string; testID?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }} testID={testID}>
      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
      <Text variant="micro" color="muted">
        {label}
      </Text>
    </View>
  );
}
