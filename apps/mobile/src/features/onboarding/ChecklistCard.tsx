import React from 'react';
import { View } from 'react-native';
import { Button, Card, CheckCircle, ProgressBar, Text, staticColors, useTheme } from '@/design-system';
import type { OnboardingStepId } from '@kash/domain';
import { useKashStore, useOnboardingStatus, type SheetName } from '@/store';

/** o que cada passo abre */
const ACTION: Record<OnboardingStepId, { label: string; sheet: SheetName }> = {
  account: { label: 'Adicionar conta', sheet: 'addAccount' },
  expense: { label: 'Lançar gasto', sheet: 'expense' },
  card: { label: 'Adicionar cartão', sheet: 'addCard' },
  bill: { label: 'Nova conta fixa', sheet: 'addBill' },
  goal: { label: 'Criar meta', sheet: 'addGoal' },
};

/** Card "Primeiros passos" no Início: marca sozinho conforme a pessoa usa o Kash (mesma regra da web). */
export function ChecklistCard() {
  const { colors } = useTheme();
  const status = useOnboardingStatus();
  const openSheet = useKashStore((s) => s.openSheet);
  const setChecklistHidden = useKashStore((s) => s.setChecklistHidden);
  if (!status.showChecklist) return null;

  if (status.allDone) {
    return (
      <Card variant="accent" radius="cardXl" padding={[18, 20]} style={{ marginTop: 10, gap: 8 }} testID="checklist-done">
        <Text variant="titleBold" color={staticColors.ink}>
          Tudo pronto! 🎉
        </Text>
        <Text variant="body" color={staticColors.ink} opacity={0.8}>
          Contas, gastos, contas fixas e metas no lugar. Agora é só usar o Kash no dia a dia.
        </Text>
        <Button label="Fechar" variant="inverse" size="sm" fullWidth={false} onPress={() => setChecklistHidden(true)} testID="checklist-close" style={{ alignSelf: 'flex-start' }} />
      </Card>
    );
  }

  return (
    <Card radius="cardXl" padding={[18, 18]} style={{ marginTop: 10, gap: 12 }} testID="checklist">
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text variant="titleBold">Primeiros passos</Text>
          <Text variant="meta" color="muted" testID="checklist-count">
            {status.doneCount} de {status.total} feitos
          </Text>
        </View>
        <Button label="Esconder" variant="secondary" size="xs" fullWidth={false} onPress={() => setChecklistHidden(true)} testID="checklist-hide" />
      </View>
      <ProgressBar pct={status.pct} height={6} />
      <View style={{ gap: 8 }}>
        {status.steps.map((step) => (
          <View
            key={step.id}
            testID={`checklist-${step.id}`}
            accessibilityLabel={`${step.title}${step.optional ? ', opcional' : ''}, ${step.done ? 'feito' : 'a fazer'}`}
            style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12, borderRadius: 14, backgroundColor: colors.surface2 }}
          >
            <CheckCircle checked={step.done} testID={`checklist-${step.id}-check`} />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text variant="title" color={step.done ? 'muted' : 'text'} style={step.done ? { textDecorationLine: 'line-through' } : null}>
                {step.title}
                {step.optional ? (
                  <Text variant="micro" color="muted">
                    {'  '}opcional
                  </Text>
                ) : null}
              </Text>
              <Text variant="meta" color="muted">
                {step.description}
              </Text>
              {!step.done ? (
                <Button
                  label={ACTION[step.id].label}
                  variant={status.next?.id === step.id ? 'primary' : 'surface'}
                  size="xs"
                  fullWidth={false}
                  onPress={() => openSheet(ACTION[step.id].sheet)}
                  testID={`checklist-${step.id}-action`}
                  style={{ alignSelf: 'flex-start', marginTop: 8 }}
                />
              ) : null}
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}
