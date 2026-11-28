import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { Card, EmptyState, PageHeader, ProgressBar, Screen, Text } from '@/design-system';
import { relativeDayLabel } from '@kash/domain';
import { now } from '@/lib/clock';
import { useMoney, useTagSummary } from '@/store';
import { DataGate } from '../navigation/DataGate';
import { TxRow } from '../transactions/TxRow';
import { TravelModeCard } from './TravelModeCard';

/** Uma tag: total gasto, por dia, por categoria, o modo viagem e os lançamentos. */
export function TagDetailScreen() {
  const router = useRouter();
  const { tag = '' } = useLocalSearchParams<{ tag?: string }>();
  const s = useTagSummary(tag);
  const money = useMoney();
  const today = now();
  return (
    <Screen testID="tag-screen" withTabBar={false} header={<PageHeader title={`# ${s?.tag ?? tag}`} onBack={() => router.back()} testID="tag" />}>
      <DataGate>
        {!s ? (
          <>
            <EmptyState icon="target" title="Sem lançamentos com essa tag" description="Os lançamentos com essa tag aparecem aqui." testID="tag-empty" />
            <TravelModeCard tag={tag} />
          </>
        ) : (
          <>
            <Card padding={20} style={{ marginTop: 8, gap: 4 }} testID="tag-summary">
              <Text variant="metaMedium" color="muted">
                Gasto com a tag
              </Text>
              <Text variant="amountLarge" testID="tag-total">
                {money(s.spent)}
              </Text>
              <Text variant="meta" color="muted" testID="tag-meta">
                {s.count} {s.count === 1 ? 'lançamento' : 'lançamentos'} em {s.days} {s.days === 1 ? 'dia' : 'dias'} ({relativeDayLabel(s.from, today)}
                {s.from !== s.to ? ` a ${relativeDayLabel(s.to, today)}` : ''}) · {money(s.perDay)} por dia
                {s.income > 0 ? ` · ${money(s.income)} de entrada` : ''}
              </Text>
            </Card>

            <View style={{ marginTop: 12 }}>
              <TravelModeCard tag={s.tag} />
            </View>

            {s.categories.length ? (
              <>
                <Text variant="section" style={{ marginTop: 24 }}>
                  Por categoria
                </Text>
                <Card padding={16} style={{ marginTop: 12, gap: 12 }} testID="tag-categories">
                  {s.categories.map((c) => (
                    <View key={c.name} style={{ gap: 6 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text variant="bodySemibold">{c.name}</Text>
                        <Text variant="bodySemibold">
                          {money(c.amount)} · {c.pct}%
                        </Text>
                      </View>
                      <ProgressBar pct={c.pct} fillColor={c.color} height={6} />
                    </View>
                  ))}
                </Card>
              </>
            ) : null}

            <Text variant="section" style={{ marginTop: 24 }}>
              Lançamentos
            </Text>
            <View style={{ marginTop: 4 }}>
              {s.views.map((t) => (
                <TxRow key={t.id} tx={t} testID={`tag-tx-${t.id}`} />
              ))}
            </View>
          </>
        )}
      </DataGate>
    </Screen>
  );
}
