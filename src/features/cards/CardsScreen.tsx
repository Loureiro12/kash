import React, { useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import {
  Button,
  Card,
  CreditCardFace,
  EmptyState,
  Pressable,
  ProgressBar,
  Screen,
  ScreenTitle,
  SectionHeader,
  Text,
  cardGradients,
  motion,
  radii,
  useTheme,
} from '@/design-system';
import { formatBRL } from '@/domain/money';
import type { Card as CardModel } from '@/domain/types';
import { useCardsOverview, useKashStore, useMoney } from '@/store';
import { DataGate } from '../navigation/DataGate';
import { TxRow } from '../transactions/TxRow';

export const gradientFor = (card: CardModel) => cardGradients.find((g) => g.id === card.gradientId) ?? cardGradients[0]!;

/** Tela 4 — Cartões. */
export function CardsScreen() {
  const { colors } = useTheme();
  const money = useMoney();
  const { list, selected, selectedTxs, selectedPlans, selectedBills, selectedInvoices } = useCardsOverview();
  const openPayInvoice = useKashStore((s) => s.openPayInvoice);
  const openInvoice = selectedInvoices.find((i) => !i.paid);
  const lastPaid = selectedInvoices.find((i) => i.paid);
  const selectCard = useKashStore((s) => s.selectCard);
  const openSheet = useKashStore((s) => s.openSheet);
  const openEdit = useKashStore((s) => s.openEdit);

  return (
    <Screen testID="cards-screen" header={<ScreenTitle title="Cartões" subtitle="Toque num cartão pra ver a fatura." testID="cards-title" />}>
      <DataGate>
      {list.length === 0 ? (
        <EmptyState icon="card" title="Nenhum cartão ainda" description="Cadastre um cartão pra acompanhar a fatura, o limite e as parcelas." actionLabel="Adicionar cartão" onAction={() => openSheet('addCard')} testID="cards-empty-state" />
      ) : (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6, marginRight: -20, marginLeft: -5 }} contentContainerStyle={{ gap: 12, paddingRight: 20, paddingLeft: 5, paddingVertical: 5 }}>
        {list.map(({ card, usage, dates }) => (
          <SelectableCard key={card.id} selected={selected?.card.id === card.id} onPress={() => selectCard(card.id)} testID={`card-${card.id}`}>
            <CreditCardFace
              name={card.name}
              gradient={gradientFor(card).colors}
              ink={gradientFor(card).ink}
              caption="Fatura atual"
              amount={money(usage.used)}
              last4={card.last4}
              footerRight={`fecha ${dates.closes}`}
            />
          </SelectableCard>
        ))}
        <Pressable
          onPress={() => openSheet('addCard')}
          testID="card-add"
          accessibilityRole="button"
          style={{ width: 120, height: 176, borderRadius: radii.creditCard, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.line, alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <Text variant="heroTitle" color="muted" style={{ fontFamily: 'Sora_500Medium', fontSize: 24 }}>
            +
          </Text>
          <Text variant="chip" color="muted">
            Novo cartão
          </Text>
        </Pressable>
      </ScrollView>
      )}

      {selected ? (
        <>
          <Card padding={[18, 20]} style={{ marginTop: 18, gap: 12 }} testID="cards-limit">
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="titleBold">Limite usado</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text variant="meta" color="muted" testID="cards-limit-pct">
                  {selected.usage.pct}%
                </Text>
                <Pressable onPress={() => openEdit({ kind: 'card', id: selected.card.id })} testID="card-edit" accessibilityRole="button" accessibilityLabel="Editar cartão" hitSlop={8}>
                  <Text variant="chip" color="accentText">
                    Editar
                  </Text>
                </Pressable>
              </View>
            </View>
            <ProgressBar pct={selected.usage.pct} height={10} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="meta" color="muted">
                Disponível{' '}
                <Text variant="value" testID="cards-available">
                  {money(selected.usage.available)}
                </Text>
              </Text>
              <Text variant="meta" color="muted">
                Limite {formatBRL(selected.card.limit)}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <Card variant="surface2" radius="input" padding={12} style={{ flex: 1, gap: 2 }}>
                <Text variant="micro" color="muted">
                  Fechamento
                </Text>
                <Text variant="value">{selected.dates.closes}</Text>
              </Card>
              <Card variant="surface2" radius="input" padding={12} style={{ flex: 1, gap: 2 }}>
                <Text variant="micro" color="muted">
                  Vencimento
                </Text>
                <Text variant="value">{selected.dates.due}</Text>
              </Card>
            </View>
          </Card>

          {openInvoice ? (
            <Card variant="accent" padding={[16, 18]} style={{ marginTop: 12, gap: 10 }} testID="cards-invoice-open">
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text variant="titleBold" color="#0B0C0E">
                  Fatura de {openInvoice.monthName} fechada
                </Text>
                <Text variant="chip" color="#0B0C0E" opacity={0.75}>
                  vence {openInvoice.dueLabel}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="amountCard" color="#0B0C0E" testID="cards-invoice-total">
                  {money(openInvoice.total)}
                </Text>
                <Button label="Pagar fatura" variant="inverse" size="sm" fullWidth={false} onPress={() => openPayInvoice(openInvoice.id)} testID="cards-invoice-pay" />
              </View>
            </Card>
          ) : lastPaid ? (
            <Text variant="meta" color="muted" style={{ marginTop: 12, marginLeft: 4 }} testID="cards-invoice-paid">
              Fatura de {lastPaid.monthName} paga{lastPaid.paidAt ? ` em ${lastPaid.paidAt.slice(8, 10)}/${lastPaid.paidAt.slice(5, 7)}` : ''} · {money(lastPaid.total)}
            </Text>
          ) : null}

          {selectedPlans.length > 0 ? (
            <>
              <SectionHeader title="Parcelas em aberto" />
              <View style={{ gap: 10, marginTop: 12 }}>
                {selectedPlans.map((p) => (
                  <Card key={p.id} radius="card" padding={[14, 16]} style={{ gap: 8 }} testID={`plan-${p.id}`}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                      <Text variant="title" numberOfLines={1} style={{ flex: 1 }}>
                        {p.title}
                      </Text>
                      <Text variant="bodyBold">{formatBRL(p.perInstallment)}/mês</Text>
                    </View>
                    <ProgressBar pct={p.pct} height={6} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text variant="micro" color="muted">
                        {p.current} de {p.installments} pagas
                      </Text>
                      <Text variant="micro" color="muted">
                        termina em {p.endsIn} · falta {formatBRL(p.remaining)}
                      </Text>
                    </View>
                  </Card>
                ))}
              </View>
            </>
          ) : null}

          {selectedBills.length > 0 ? (
            <>
              <SectionHeader title="Cobranças recorrentes" />
              <Card radius="card" padding={0} style={{ marginTop: 12, overflow: 'hidden' }} testID="cards-bills">
                {selectedBills.map((b, i) => (
                  <View
                    key={b.id}
                    testID={`card-bill-${b.id}`}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: i < selectedBills.length - 1 ? 1 : 0, borderBottomColor: colors.line }}
                  >
                    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                      <Text variant="title" numberOfLines={1}>
                        {b.name}
                      </Text>
                      <Text variant="meta" color="muted">
                        {b.paid ? 'Já na fatura deste mês' : `Todo dia ${b.dueDay}`}
                      </Text>
                    </View>
                    <Text variant="value">{formatBRL(b.amount)}</Text>
                  </View>
                ))}
              </Card>
            </>
          ) : null}

          <SectionHeader title="Lançamentos da fatura" />
          <View style={{ marginTop: 6 }} testID="cards-txs">
            {selectedTxs.length === 0 ? (
              <Text variant="body" color="muted" align="center" style={{ paddingVertical: 28 }} testID="cards-empty">
                Nenhum gasto nesse cartão ainda.
              </Text>
            ) : (
              selectedTxs.map((t) => <TxRow key={t.id} tx={t} testID={`card-tx-${t.id}`} />)
            )}
          </View>
        </>
      ) : null}
      </DataGate>
    </Screen>
  );
}

/** Wrapper com outline 2px accent (offset 3) e scale .96→1 em 200ms. */
function SelectableCard({ selected, onPress, testID, children }: { selected: boolean; onPress: () => void; testID: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  const scale = useSharedValue(selected ? 1 : motion.cardInactiveScale);
  useEffect(() => {
    scale.value = withTiming(selected ? 1 : motion.cardInactiveScale, { duration: motion.duration.fast });
  }, [selected, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable onPress={onPress} testID={testID} haptic="selection" pressedOpacity={0.9} accessibilityRole="button" accessibilityState={{ selected }}>
      <Animated.View style={[{ padding: 3, borderRadius: radii.creditCard + 3, borderWidth: 2, borderColor: selected ? colors.accent : 'transparent', margin: -5 }, style]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
