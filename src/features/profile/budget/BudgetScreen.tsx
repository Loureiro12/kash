import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Keypad, PageHeader, ProgressBar, Screen, Text, type KeypadKey } from '@/design-system';
import { applyKeypadKey, digitsToAmount, formatBRL } from '@/domain/money';
import { budgetStatus } from '@/domain/selectors/budget';
import { useHomeSummary, useKashStore } from '@/store';

/** Perfil › Limite mensal — define o teto de gastos usado em Início, Relatório e Previsão. */
export function BudgetScreen() {
  const router = useRouter();
  const budget = useKashStore((s) => s.settings.monthlyBudget);
  const setMonthlyBudget = useKashStore((s) => s.setMonthlyBudget);
  const showToast = useKashStore((s) => s.showToast);
  const { spent } = useHomeSummary();

  const [digits, setDigits] = useState(String(Math.round(budget * 100)));
  const value = digitsToAmount(digits);
  const preview = budgetStatus(spent, value);
  const canSave = value > 0 && value !== budget;
  const onKey = (key: KeypadKey) => setDigits((d) => applyKeypadKey(d, key));

  const onSave = () => {
    if (!canSave) return;
    setMonthlyBudget(value);
    showToast(`Limite mensal: ${formatBRL(value)}`);
    router.back();
  };

  return (
    <Screen testID="budget-screen" header={<PageHeader title="Limite mensal" onBack={() => router.back()} testID="budget" />}>
      <Text variant="body" color="muted">
        Quanto você quer gastar por mês, no máximo. O Kash usa esse valor na Início, no Relatório e na Previsão.
      </Text>
      <View style={{ alignItems: 'center', paddingVertical: 22 }}>
        <Text variant="amountSheet" color={value > 0 ? 'text' : 'muted'} testID="budget-amount">
          {formatBRL(value)}
        </Text>
      </View>

      <Card padding={[16, 18]} style={{ gap: 10, marginBottom: 16 }} testID="budget-preview">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Text variant="titleBold">Gasto até agora</Text>
          <Text variant="meta" color="muted">
            {formatBRL(spent)} · {value > 0 ? preview.pct : 0}%
          </Text>
        </View>
        <ProgressBar pct={value > 0 ? preview.pct : 0} height={8} />
        <Text variant="meta" color={value > 0 && preview.left > 0 ? 'muted' : 'neg'} testID="budget-preview-message">
          {value > 0 ? preview.message : 'Digite um valor maior que zero'}
        </Text>
      </Card>

      <Keypad onKey={onKey} testID="budget-keypad" />
      <Button label="Salvar limite" onPress={onSave} disabled={!canSave} testID="budget-save" style={{ marginTop: 16 }} haptic="medium" />
    </Screen>
  );
}
