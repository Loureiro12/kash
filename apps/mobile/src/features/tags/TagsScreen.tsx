import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { Card, EmptyState, ListRow, PageHeader, Screen, Text } from '@/design-system';
import { relativeDayLabel } from '@kash/domain';
import { now } from '@/lib/clock';
import { useMoney, useTagTotals } from '@/store';
import { DataGate } from '../navigation/DataGate';
import { TravelModeCard } from './TravelModeCard';

/** Tags: o modo viagem e cada tag usada com o total gasto (toque abre o detalhe). */
export function TagsScreen() {
  const router = useRouter();
  const tags = useTagTotals();
  const money = useMoney();
  const today = now();
  return (
    <Screen testID="tags-screen" withTabBar={false} header={<PageHeader title="Tags" onBack={() => router.back()} testID="tags" />}>
      <DataGate>
        <View style={{ marginTop: 8 }}>
          <TravelModeCard />
        </View>
        <Text variant="section" style={{ marginTop: 24 }}>
          Suas tags
        </Text>
        {tags.length === 0 ? (
          <EmptyState icon="target" title="Nenhuma tag ainda" description="Ao lançar, toque em “+ Tag” para juntar gastos de uma viagem, um evento ou uma reforma, fora das categorias." testID="tags-empty" />
        ) : (
          <Card padding={[4, 16]} style={{ marginTop: 12 }}>
            {tags.map((t, i) => (
              <ListRow
                key={t.tag}
                title={`# ${t.tag}`}
                subtitle={`${t.count} ${t.count === 1 ? 'lançamento' : 'lançamentos'} · ${t.from === t.to ? relativeDayLabel(t.from, today) : `${relativeDayLabel(t.from, today)} a ${relativeDayLabel(t.to, today)}`}`}
                value={money(t.spent)}
                onPress={() => router.push({ pathname: '/tags/[tag]', params: { tag: t.tag } })}
                divider={i < tags.length - 1}
                testID={`tags-row-${i}`}
              />
            ))}
          </Card>
        )}
      </DataGate>
    </Screen>
  );
}
