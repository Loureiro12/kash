import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { Card, PageHeader, ProgressBar, Screen, Text, useTheme } from '@/design-system';
import { monthName } from '@kash/domain';
import { now } from '@/lib/clock';
import { useMoney, useReport } from '@/store';

/** Tela 7 — Relatório (página interna). */
export function ReportScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const money = useMoney();
  const { spent, history, delta, categories } = useReport();

  return (
    <Screen testID="report-screen" header={<PageHeader title="Relatório" onBack={() => router.back()} testID="report" />}>
      <Card padding={20} style={{ marginTop: 6 }}>
        <Text variant="meta" color="muted">
          Gastos · {monthName(0, now())}
        </Text>
        <Text variant="amountLarge" style={{ marginTop: 2 }} testID="report-total">
          {money(spent)}
        </Text>
        <Text variant="chip" color="accentText" style={{ marginTop: 2 }}>
          {delta.message}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 120, marginTop: 20 }} testID="report-chart">
          {history.map((m) => (
            <View key={m.label} style={{ flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
              <View style={{ width: '100%', borderRadius: 8, height: `${m.height}%`, backgroundColor: m.current ? colors.accent : colors.surface2 }} />
              <Text variant="microSemibold" color={m.current ? 'text' : 'muted'}>
                {m.label}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <Text variant="section" style={{ marginTop: 24 }}>
        Por categoria
      </Text>
      <View style={{ gap: 14, marginTop: 14 }} testID="report-categories">
        {categories.map((c) => (
          <View key={c.name} style={{ gap: 7 }} testID={`report-cat-${c.name}`}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: c.color }} />
                <Text variant="bodySemibold">{c.name}</Text>
              </View>
              <Text variant="body" color="muted">
                {money(c.amount)} · {c.pct}%
              </Text>
            </View>
            <ProgressBar pct={c.pct} height={8} fillColor={c.color} />
          </View>
        ))}
      </View>
    </Screen>
  );
}
