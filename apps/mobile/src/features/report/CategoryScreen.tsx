import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Card, Chip, PageHeader, Pressable, ProgressBar, Screen, Text, useTheme } from '@/design-system';
import { formatBRL } from '@kash/domain';
import { useCategories, useCategoryDetail, useMoney } from '@/store';
import { TxRow } from '../transactions/TxRow';

/**
 * Gastos de uma categoria, no estilo da Previsão: barras dos últimos 6 meses (toque escolhe o mês),
 * total e comparação, onde mais gastou e os lançamentos do mês. Chips no topo trocam de categoria.
 */
export function CategoryScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const money = useMoney();
  const params = useLocalSearchParams<{ name?: string }>();
  const { names, colors: categoryColors } = useCategories();
  const [category, setCategory] = useState(params.name ?? names[0] ?? 'Outros');
  const [offset, setOffset] = useState(0);
  const d = useCategoryDetail(category, offset);

  const pick = (name: string) => {
    setCategory(name);
    router.setParams({ name });
  };

  return (
    <Screen testID="category-screen" header={<PageHeader title={category} onBack={() => router.back()} testID="category" />}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }} testID="category-chips">
        {names.map((c) => (
          <Chip key={c} label={c} dotColor={categoryColors[c]} selected={c === category} onPress={() => pick(c)} testID={`category-chip-${c}`} />
        ))}
      </ScrollView>

      <Card padding={20} style={{ marginTop: 16 }} testID="category-summary">
        <Text variant="meta" color="muted" testID="category-month-heading">
          {category} em {d.selected.name}
        </Text>
        <Text variant="amountLarge" style={{ marginTop: 2 }} testID="category-total" accessibilityLiveRegion="polite">
          {money(d.selected.total)}
        </Text>
        <Text variant="chip" color={d.delta.pct > 0 ? 'neg' : 'accentText'} style={{ marginTop: 2 }} testID="category-delta">
          {d.delta.message}
        </Text>
        {d.count > 0 ? (
          <Text variant="meta" color="muted" style={{ marginTop: 6 }} testID="category-stats">
            {d.sharePct}% dos seus gastos do mês · {d.count} {d.count === 1 ? 'lançamento' : 'lançamentos'} · média de {money(d.average)}
          </Text>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 140, marginTop: 18 }} testID="category-chart">
          {d.months.map((m) => {
            const active = m.offset === d.selected.offset;
            return (
              <Pressable
                key={m.offset}
                onPress={() => setOffset(m.offset)}
                testID={`category-month-${m.offset}`}
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
                <View style={{ width: '100%', height: `${m.height * 0.82}%`, borderRadius: 8, backgroundColor: d.color, opacity: active ? 1 : 0.4 }} />
                <Text variant="microSemibold" color={active ? 'text' : 'muted'}>
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {d.places.length > 0 ? (
        <>
          <Text variant="section" style={{ marginTop: 24 }}>
            Onde você mais gastou
          </Text>
          <View style={{ gap: 14, marginTop: 14 }} testID="category-places">
            {d.places.map((p, i) => (
              <View key={p.title} style={{ gap: 7 }} testID={`category-place-${i}`}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                  <Text variant="bodySemibold" numberOfLines={1} style={{ flex: 1 }}>
                    {p.title}
                    <Text variant="meta" color="muted">
                      {p.count > 1 ? `  ${p.count}×` : ''}
                    </Text>
                  </Text>
                  <Text variant="body" color="muted">
                    {money(p.amount)} · {p.pct}%
                  </Text>
                </View>
                <ProgressBar pct={p.pct} height={6} fillColor={d.color} />
              </View>
            ))}
          </View>
        </>
      ) : null}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 24 }}>
        <Text variant="section" testID="category-list-title">
          Lançamentos de {d.selected.name}
        </Text>
        <Text variant="meta" color="muted">
          {d.count} {d.count === 1 ? 'lançamento' : 'lançamentos'}
        </Text>
      </View>
      {d.groups.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 32, gap: 6 }} testID="category-empty">
          <Text variant="titleBold">Nada por aqui</Text>
          <Text variant="body" color="muted" align="center">
            Nenhum gasto em {category} em {d.selected.name}.
          </Text>
        </View>
      ) : (
        d.groups.map((g) => (
          <View key={g.date} testID={`category-day-${g.date}`}>
            <Text variant="eyebrow" color="muted" style={{ marginTop: 18, marginBottom: 2, marginLeft: 4 }}>
              {g.label}
            </Text>
            {g.items.map((t) => (
              <TxRow key={t.id} tx={t} testID={`category-tx-${t.id}`} />
            ))}
          </View>
        ))
      )}
      <View style={{ height: 1, backgroundColor: colors.bg }} />
    </Screen>
  );
}
