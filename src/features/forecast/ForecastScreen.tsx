import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { Card, PageHeader, Pressable, Screen, Text, useTheme } from '@/design-system';
import { formatBRL } from '@/domain/money';
import { forecastHeights } from '@/domain/selectors/forecast';
import { useForecast, useKashStore } from '@/store';

/** Tela 8 — Previsão (página interna). */
export function ForecastScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const budget = useKashStore((s) => s.settings.monthlyBudget);
  const months = useForecast();
  const heights = forecastHeights(months, 8);
  const [selected, setSelected] = useState(1);
  const next = months[0];
  const current = months[selected - 1] ?? next;

  return (
    <Screen testID="forecast-screen">
      <PageHeader title="Previsão" onBack={() => router.back()} testID="forecast" />
      <Text variant="body" color="muted" style={{ marginTop: 8 }}>
        Quanto já está comprometido nos próximos meses com contas fixas e parcelas do cartão.
      </Text>

      {next && current ? (
        <>
          <Card padding={20} style={{ marginTop: 18 }}>
            <Text variant="meta" color="muted">
              Comprometido em {next.name}
            </Text>
            <Text variant="amountLarge" style={{ marginTop: 2 }} testID="forecast-next-total">
              {formatBRL(next.total)}
            </Text>
            <Text variant="meta" color="muted" style={{ marginTop: 2 }}>
              {Math.round((next.total / budget) * 100)}% do seu limite mensal de {formatBRL(budget)}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 120, marginTop: 20 }} testID="forecast-chart">
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
                    style={{ flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}
                  >
                    <View style={{ width: '100%', height: `${heights[i] ?? 8}%`, borderRadius: 8, overflow: 'hidden', opacity: active ? 1 : 0.45 }}>
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
            <View style={{ flexDirection: 'row', gap: 14, marginTop: 14 }}>
              <Legend color={colors.muted} label="Contas fixas" />
              <Legend color={colors.accent} label="Parcelas" />
            </View>
          </Card>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 24 }}>
            <Text variant="section" testID="forecast-selected-title">
              Em {current.name}
            </Text>
            <Text variant="section" testID="forecast-selected-total">
              {formatBRL(current.total)}
            </Text>
          </View>
          <View style={{ marginTop: 6 }} testID="forecast-items">
            {current.items.map((item) => (
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

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
      <Text variant="micro" color="muted">
        {label}
      </Text>
    </View>
  );
}
