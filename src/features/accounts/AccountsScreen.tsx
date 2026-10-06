import React from 'react';
import { View } from 'react-native';
import { Card, CheckCircle, DashedButton, Pressable, Screen, SegmentedControl, Text, TileIcon } from '@/design-system';
import { formatBRL } from '@/domain/money';
import { totalBalance } from '@/domain/selectors/balance';
import { useBillsSummary, useKashStore, useMoney } from '@/store';
import type { AccountsSegment } from '@/store';

/** Tela 5 — Contas (segmentado Bancárias | Fixas). */
export function AccountsScreen() {
  const segment = useKashStore((s) => s.ui.accountsSegment);
  const setSegment = useKashStore((s) => s.setAccountsSegment);
  return (
    <Screen testID="accounts-screen">
      <Text variant="screenTitle">Contas</Text>
      <View style={{ marginTop: 16 }}>
        <SegmentedControl<AccountsSegment>
          value={segment}
          onChange={setSegment}
          options={[
            { value: 'bank', label: 'Bancárias', testID: 'seg-bank' },
            { value: 'bills', label: 'Fixas', testID: 'seg-bills' },
          ]}
        />
      </View>
      {segment === 'bank' ? <BankAccounts /> : <FixedBills />}
    </Screen>
  );
}

function BankAccounts() {
  const money = useMoney();
  const accounts = useKashStore((s) => s.accounts);
  const openSheet = useKashStore((s) => s.openSheet);
  return (
    <View testID="accounts-bank">
      <Card padding={20} style={{ marginTop: 18, gap: 4 }}>
        <Text variant="meta" color="muted">
          Em todas as contas
        </Text>
        <Text variant="amountLarge" testID="accounts-total">
          {money(totalBalance(accounts))}
        </Text>
      </Card>
      <View style={{ gap: 10, marginTop: 14 }}>
        {accounts.map((a) => (
          <Card key={a.id} radius="card" padding={16} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }} testID={`account-${a.id}`}>
            <TileIcon initial={a.name[0] ?? '?'} color={a.color} mode="solid" size={42} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="title">{a.name}</Text>
              <Text variant="meta" color="muted">
                {a.kind}
              </Text>
            </View>
            <Text variant="valueLg">{money(a.balance)}</Text>
          </Card>
        ))}
        <DashedButton label="+ Adicionar conta" onPress={() => openSheet('addAccount')} testID="accounts-add" />
      </View>
    </View>
  );
}

function FixedBills() {
  const bills = useKashStore((s) => s.bills);
  const toggle = useKashStore((s) => s.toggleBillPaid);
  const showToast = useKashStore((s) => s.showToast);
  const summary = useBillsSummary();
  return (
    <View testID="accounts-bills">
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
        <Card radius="card" padding={16} style={{ flex: 1, gap: 4 }}>
          <Text variant="micro" color="muted">
            A pagar
          </Text>
          <Text variant="amountMedium" color="neg" testID="bills-pending">
            {formatBRL(summary.pendingTotal)}
          </Text>
        </Card>
        <Card radius="card" padding={16} style={{ flex: 1, gap: 4 }}>
          <Text variant="micro" color="muted">
            Pagas
          </Text>
          <Text variant="amountMedium" color="accentText" testID="bills-paid-count">
            {summary.paidCount}/{summary.count}
          </Text>
        </Card>
      </View>
      <Text variant="meta" color="muted" style={{ marginTop: 16 }}>
        Toque pra marcar como paga
      </Text>
      <View style={{ gap: 10, marginTop: 10 }}>
        {bills.map((b) => (
          <Pressable
            key={b.id}
            onPress={() => toggle(b.id)}
            testID={`bill-${b.id}`}
            haptic="light"
            pressedOpacity={0.8}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: b.paid }}
            accessibilityLabel={`${b.name}, ${b.paid ? 'paga' : `vence dia ${b.dueDay}`}`}
          >
            <Card radius="card" padding={[14, 16]} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, opacity: b.paid ? 0.55 : 1 }}>
              <CheckCircle checked={b.paid} testID={`bill-${b.id}-check`} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="title" style={b.paid ? { textDecorationLine: 'line-through' } : null}>
                  {b.name}
                </Text>
                <Text variant="meta" color="muted" testID={`bill-${b.id}-status`}>
                  {b.paid ? 'Paga' : `Vence dia ${b.dueDay}`}
                </Text>
              </View>
              <Text variant="valueLg">{formatBRL(b.amount)}</Text>
            </Card>
          </Pressable>
        ))}
        <DashedButton label="+ Nova conta fixa" onPress={() => showToast('Em breve: cadastro de conta fixa')} testID="bills-add" />
      </View>
    </View>
  );
}
