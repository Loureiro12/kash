import React from 'react';
import { View } from 'react-native';
import { Button, Card, DashedButton, ProgressRing, Screen, Text, staticColors } from '@/design-system';
import { formatBRL } from '@/domain/money';
import { useGoalsOverview, useKashStore, useMoney } from '@/store';

const CONTRIBUTION = 50;

/** Tela 6 — Metas. */
export function GoalsScreen() {
  const money = useMoney();
  const { goals, totalSaved, tip } = useGoalsOverview();
  const contribute = useKashStore((s) => s.contributeToGoal);
  const showToast = useKashStore((s) => s.showToast);
  const openSheet = useKashStore((s) => s.openSheet);

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
      <View style={{ gap: 12, marginTop: 6 }}>
        {goals.map(({ goal, progress }) => (
          <Card key={goal.id} padding={18} style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }} testID={`goal-${goal.id}`}>
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
            <Button label="+ R$ 50" variant="soft" size="sm" fullWidth={false} disabled={progress.done} onPress={() => onAdd(goal.id, goal.name)} testID={`goal-${goal.id}-add`} />
          </Card>
        ))}
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
    </Screen>
  );
}
