import React from 'react';
import { View } from 'react-native';
import { Button, Card, DashedButton, EmptyState, Icon, Pressable, ProgressRing, Screen, Text, staticColors, useTheme } from '@/design-system';
import { DataGate } from '../navigation/DataGate';
import { formatBRL } from '@kash/domain';
import { useGoalsOverview, useKashStore, useMoney } from '@/store';

const CONTRIBUTION = 50;

/** Tela 6 — Metas. */
export function GoalsScreen() {
  const { colors } = useTheme();
  const money = useMoney();
  const { goals, totalSaved, tip } = useGoalsOverview();
  const contribute = useKashStore((s) => s.contributeToGoal);
  const showToast = useKashStore((s) => s.showToast);
  const openSheet = useKashStore((s) => s.openSheet);
  const openDeposit = useKashStore((s) => s.openDeposit);
  const openEdit = useKashStore((s) => s.openEdit);

  const onAdd = (id: string, name: string) => {
    contribute(id, CONTRIBUTION);
    showToast(`${formatBRL(CONTRIBUTION)} guardados em “${name}”`);
  };

  const header = (
    <View>
      <Text variant="screenTitle">Metas</Text>
      <Text variant="body" color="muted" style={{ marginTop: 4 }}>
        Você já guardou{' '}
        <Text variant="bodyBold" color="accentText" testID="goals-total">
          {money(totalSaved)}
        </Text>{' '}
        no total.
      </Text>
    </View>
  );

  return (
    <Screen testID="goals-screen" header={header}>
      <DataGate>
      {goals.length === 0 ? (
        <EmptyState icon="target" title="Nenhuma meta ainda" description="Viagem, reserva de emergência, fone novo: crie uma meta e veja o dinheiro crescer." actionLabel="Criar meta" onAction={() => openSheet('addGoal')} testID="goals-empty-state" />
      ) : (
        <Text variant="micro" color="muted" style={{ marginTop: 2 }}>
          Toque e segure uma meta pra editar
        </Text>
      )}
      <View style={{ gap: 12, marginTop: 6 }}>
        {goals.map(({ goal, progress, deposit, depositLabel, accountName }) => {
          const due = deposit.kind === 'due' && !progress.done;
          return (
            <Pressable key={goal.id} onLongPress={() => openEdit({ kind: 'goal', id: goal.id })} testID={`goal-${goal.id}`} pressedOpacity={1} accessible={false}>
            <Card padding={18} style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <ProgressRing pct={progress.pct} color={goal.color} testID={`goal-${goal.id}-ring`} />
                <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                  <Text variant="valueLg">{goal.name}</Text>
                  <Text variant="meta" color="muted" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} testID={`goal-${goal.id}-saved`}>
                    {money(goal.saved)} de {formatBRL(goal.target)}
                  </Text>
                  <Text variant="meta" color="muted" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                    {progress.eta}
                  </Text>
                </View>
                {due ? (
                  <Button label="Depositar" variant="primary" size="sm" fullWidth={false} onPress={() => openDeposit(goal.id)} testID={`goal-${goal.id}-deposit`} />
                ) : (
                  <Button label="+ R$ 50" variant="soft" size="sm" fullWidth={false} disabled={progress.done} onPress={() => onAdd(goal.id, goal.name)} testID={`goal-${goal.id}-add`} />
                )}
              </View>
              {deposit.kind !== 'none' || accountName ? (
                /* linha de depósito (largura total): toque registra um depósito a qualquer momento */
                <Pressable
                  onPress={() => openDeposit(goal.id)}
                  disabled={progress.done}
                  testID={`goal-${goal.id}-deposit-line`}
                  accessibilityRole="button"
                  accessibilityLabel={`${accountName ? `${accountName}. ` : ''}${depositLabel}. Registrar depósito`}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line }}
                >
                  <Text variant="chip" color={due ? 'accentText' : 'muted'} numberOfLines={1} style={{ flex: 1 }} testID={`goal-${goal.id}-deposit-status`}>
                    {accountName ? `${accountName} · ` : ''}
                    {depositLabel}
                  </Text>
                  {!progress.done ? <Icon name="chevron-right" size={14} color={due ? colors.accentText : colors.muted} strokeWidth={2} /> : null}
                </Pressable>
              ) : null}
            </Card>
            </Pressable>
          );
        })}
        <DashedButton label="+ Nova meta" height={56} onPress={() => openSheet('addGoal')} testID="goals-add" />
      </View>

      {tip ? (
        <Card variant="accent" padding={18} style={{ marginTop: 18, gap: 6 }} testID="goals-tip">
          <Text variant="titleBold" color={staticColors.ink}>
            Dica da semana
          </Text>
          <Text variant="body" color={staticColors.ink} opacity={0.85}>
            Você gastou {formatBRL(tip.amount)} com {tip.name} este mês. Guardar 10% disso já adianta sua meta em {formatBRL(tip.tip)}.
          </Text>
        </Card>
      ) : null}
      </DataGate>
    </Screen>
  );
}
