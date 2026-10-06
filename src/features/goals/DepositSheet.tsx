import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { BottomSheet, Button, Chip, Keypad, Text, type KeypadKey } from '@/design-system';
import { applyKeypadKey, digitsToAmount, formatBRL } from '@/domain/money';
import { useKashStore } from '@/store';

/** Sheet — Registrar depósito numa meta (valor sugerido = aporte mensal; conta = onde fica guardado). */
export function DepositSheet() {
  const visible = useKashStore((s) => s.ui.sheet === 'deposit');
  const nonce = useKashStore((s) => s.ui.sheetNonce);
  const goalId = useKashStore((s) => s.ui.depositGoalId);
  const closeSheet = useKashStore((s) => s.closeSheet);
  return <DepositForm key={`${nonce}-${goalId ?? ''}`} visible={visible} goalId={goalId} onClose={closeSheet} />;
}

function DepositForm({ visible, goalId, onClose }: { visible: boolean; goalId: string | null; onClose: () => void }) {
  const goal = useKashStore((s) => s.goals.find((g) => g.id === goalId) ?? null);
  const accounts = useKashStore((s) => s.accounts);
  const recordDeposit = useKashStore((s) => s.recordDeposit);
  const showToast = useKashStore((s) => s.showToast);

  const suggested = goal ? Math.round(goal.monthly * 100) : 0;
  const [digits, setDigits] = useState(suggested > 0 ? String(suggested) : '');
  const [accountId, setAccountId] = useState(goal?.accountId ?? accounts[0]?.id ?? '');

  const amount = digitsToAmount(digits);
  const canSave = !!goal && amount > 0;
  const remaining = goal ? Math.max(0, goal.target - goal.saved) : 0;
  const onKey = (key: KeypadKey) => setDigits((d) => applyKeypadKey(d, key));

  const onSave = () => {
    if (!goal || !canSave) return;
    recordDeposit({ goalId: goal.id, amountCents: Math.round(amount * 100), accountId });
    showToast(`${formatBRL(amount)} depositado em “${goal.name}”`);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Registrar depósito"
      testID="sheet-deposit"
      gap={16}
      footer={<Button label="Confirmar depósito" onPress={onSave} disabled={!canSave} testID="deposit-save" haptic="medium" />}
    >
      {goal ? (
        <>
          <View style={{ alignItems: 'center', gap: 4, paddingVertical: 6 }}>
            <Text variant="meta" color="muted" testID="deposit-goal-name">
              {goal.name} · faltam {formatBRL(remaining)}
            </Text>
            <Text variant="amountSheet" color={canSave ? 'text' : 'muted'} testID="deposit-amount">
              {formatBRL(amount)}
            </Text>
          </View>

          <Text variant="metaMedium" color="muted">
            Onde o dinheiro está guardado
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled">
            {accounts.map((a) => (
              <Chip key={a.id} label={a.name} tone="soft" shape="rounded" height={34} selected={accountId === a.id} onPress={() => setAccountId(a.id)} testID={`deposit-account-${a.id}`} />
            ))}
          </ScrollView>

          <Keypad onKey={onKey} testID="deposit-keypad" />
        </>
      ) : null}
    </BottomSheet>
  );
}
