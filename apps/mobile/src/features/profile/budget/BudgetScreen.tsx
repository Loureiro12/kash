import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Keypad, PageHeader, Pressable, ProgressBar, Screen, Switch, Text, useTheme, type KeypadKey } from '@/design-system';
import { applyKeypadKey, budgetStatus, digitsToAmount, formatBRL } from '@kash/domain';
import { useKashStore, useMonthSpentSplit } from '@/store';

type Field = 'total' | 'card' | 'rest';
const toDigits = (v: number) => String(Math.round(v * 100));

/**
 * Perfil › Limite mensal — teto de gastos usado em Início, Relatório e Previsão. Pode ser dividido
 * em cartão (a fatura do mês de todos os cartões) e restante (débito, Pix, dinheiro); o total é a soma.
 */
export function BudgetScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const budget = useKashStore((s) => s.settings.monthlyBudget);
  const cardBudget = useKashStore((s) => Math.min(s.settings.cardBudget || 0, s.settings.monthlyBudget));
  const setBudgets = useKashStore((s) => s.setBudgets);
  const showToast = useKashStore((s) => s.showToast);
  const spent = useMonthSpentSplit();

  const [split, setSplit] = useState(cardBudget > 0);
  const [active, setActive] = useState<Field>(cardBudget > 0 ? 'card' : 'total');
  const [digits, setDigits] = useState<Record<Field, string>>({ total: toDigits(budget), card: toDigits(cardBudget), rest: toDigits(budget - cardBudget) });
  const value = (f: Field) => digitsToAmount(digits[f]);
  const card = split ? value('card') : 0;
  const rest = split ? value('rest') : value('total');
  const total = card + rest;
  const valid = total > 0 && (!split || card > 0);
  const changed = Math.abs(total - budget) > 0.004 || Math.abs(card - cardBudget) > 0.004;
  const canSave = valid && changed;

  const onKey = (key: KeypadKey) => setDigits((d) => ({ ...d, [active]: applyKeypadKey(d[active], key) }));
  const toggleSplit = (on: boolean) => {
    setSplit(on);
    // dividir começa com tudo no restante; juntar volta a um total só (a soma)
    if (on) setDigits({ total: toDigits(total), card: toDigits(0), rest: toDigits(total) });
    else setDigits((d) => ({ ...d, total: toDigits(total) }));
    setActive(on ? 'card' : 'total');
  };

  const onSave = () => {
    if (!canSave) return;
    setBudgets(card, rest);
    showToast(split ? `Limite: ${formatBRL(card)} no cartão + ${formatBRL(rest)} no restante` : `Limite mensal: ${formatBRL(total)}`);
    router.back();
  };

  const amountBox = (field: Field, label: string, hint: string) => (
    <Pressable
      onPress={() => setActive(field)}
      accessibilityRole="button"
      accessibilityState={{ selected: active === field }}
      accessibilityLabel={`${label}: ${formatBRL(value(field))}. Toque para editar`}
      testID={`budget-field-${field}`}
      style={{ flex: 1, padding: 14, borderRadius: 16, gap: 2, borderWidth: 1.5, borderColor: active === field ? colors.accentText : colors.line, backgroundColor: colors.surface }}
    >
      <Text variant="chip" color={active === field ? 'accentText' : 'muted'}>
        {label}
      </Text>
      <Text variant="amountMedium" testID={`budget-${field}-amount`}>
        {formatBRL(value(field))}
      </Text>
      <Text variant="meta" color="muted">
        {hint}
      </Text>
    </Pressable>
  );

  const preview = (label: string, spentValue: number, limit: number, testID: string) => {
    const st = budgetStatus(spentValue, limit);
    return (
      <View style={{ gap: 8 }} testID={testID}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Text variant="titleBold">{label}</Text>
          <Text variant="meta" color="muted">
            {formatBRL(spentValue)} · {limit > 0 ? st.pct : 0}%
          </Text>
        </View>
        <ProgressBar pct={limit > 0 ? st.pct : 0} height={8} />
        <Text variant="meta" color={limit > 0 && st.left > 0 ? 'muted' : 'neg'} testID={`${testID}-message`}>
          {limit > 0 ? st.message : 'Digite um valor maior que zero'}
        </Text>
      </View>
    );
  };

  return (
    <Screen testID="budget-screen" header={<PageHeader title="Limite mensal" onBack={() => router.back()} testID="budget" />} withTabBar={false}>
      <Text variant="body" color="muted">
        Quanto você quer gastar por mês, no máximo. O Kash usa esse valor na Início, no Relatório e na Previsão.
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 }}>
        <View style={{ flex: 1 }}>
          <Text variant="bodySemibold">Separar cartão e o restante</Text>
          <Text variant="meta" color="muted">
            Uma meta para a fatura dos cartões e outra para débito, Pix e dinheiro. Pagar a fatura não conta duas vezes.
          </Text>
        </View>
        <Switch value={split} onValueChange={toggleSplit} testID="budget-split-switch" accessibilityLabel="Separar cartão e o restante" />
      </View>

      {split ? (
        <>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            {amountBox('card', 'Cartão', 'fatura do mês')}
            {amountBox('rest', 'Restante', 'débito, Pix, dinheiro')}
          </View>
          <Text variant="meta" color="muted" align="center" style={{ marginTop: 10 }} testID="budget-total">
            Total do mês: {formatBRL(total)}
          </Text>
        </>
      ) : (
        <View style={{ alignItems: 'center', paddingVertical: 22 }}>
          <Text variant="amountSheet" color={total > 0 ? 'text' : 'muted'} testID="budget-amount">
            {formatBRL(total)}
          </Text>
        </View>
      )}

      <Card padding={[16, 18]} style={{ gap: 14, marginVertical: 16 }} testID="budget-preview">
        {split ? (
          <>
            {preview('Cartão até agora', spent.card, card, 'budget-preview-card')}
            {preview('Restante até agora', spent.rest, rest, 'budget-preview-rest')}
          </>
        ) : (
          preview('Gasto até agora', spent.total, total, 'budget-preview-total')
        )}
      </Card>

      <Keypad onKey={onKey} testID="budget-keypad" />
      <Button label="Salvar limite" onPress={onSave} disabled={!canSave} testID="budget-save" style={{ marginTop: 16 }} haptic="medium" />
    </Screen>
  );
}
