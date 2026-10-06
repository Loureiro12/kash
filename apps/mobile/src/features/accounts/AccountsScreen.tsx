import React from 'react';
import { View } from 'react-native';
import { Card, CheckCircle, DashedButton, EmptyState, Pressable, Screen, SegmentedControl, Text, TileIcon } from '@/design-system';
import { DataGate } from '../navigation/DataGate';
import { formatBRL, totalBalance } from '@kash/domain';
import { useBillsSummary, useBillsView, useKashStore, useMoney } from '@/store';
import type { AccountsSegment } from '@/store';

/** Tela 5 — Contas (segmentado Bancárias | Fixas). */
export function AccountsScreen() {
  const segment = useKashStore((s) => s.ui.accountsSegment);
  const setSegment = useKashStore((s) => s.setAccountsSegment);
  return (
    <Screen testID="accounts-screen" header={<Text variant="screenTitle">Contas</Text>}>
      <View style={{ marginTop: 4 }}>
        <SegmentedControl<AccountsSegment>
          value={segment}
          onChange={setSegment}
          options={[
            { value: 'bank', label: 'Bancárias', testID: 'seg-bank' },
            { value: 'bills', label: 'Fixas', testID: 'seg-bills' },
          ]}
        />
      </View>
      <DataGate>{segment === 'bank' ? <BankAccounts /> : <FixedBills />}</DataGate>
    </Screen>
  );
}

function BankAccounts() {
  const money = useMoney();
  const accounts = useKashStore((s) => s.accounts);
  const openSheet = useKashStore((s) => s.openSheet);
  const openEdit = useKashStore((s) => s.openEdit);
  if (accounts.length === 0) {
    return (
      <View testID="accounts-bank">
        <EmptyState icon="wallet" title="Nenhuma conta ainda" description="Adicione sua conta corrente, poupança ou carteira pra ver o saldo total." actionLabel="Adicionar conta" onAction={() => openSheet('addAccount')} testID="accounts-empty-state" />
      </View>
    );
  }
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
          <Pressable
            key={a.id}
            onPress={() => openEdit({ kind: 'account', id: a.id })}
            testID={`account-${a.id}`}
            pressedOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${a.name}, ${a.kind}, ${money(a.balance)}`}
            accessibilityHint="Abre a conta para editar"
          >
            <Card radius="card" padding={16} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <TileIcon initial={a.name[0] ?? '?'} color={a.color} mode="solid" size={42} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="title">{a.name}</Text>
                <Text variant="meta" color="muted">
                  {a.kind}
                </Text>
              </View>
              <Text variant="valueLg">{money(a.balance)}</Text>
            </Card>
          </Pressable>
        ))}
        <DashedButton label="+ Adicionar conta" onPress={() => openSheet('addAccount')} testID="accounts-add" />
      </View>
    </View>
  );
}

function FixedBills() {
  const bills = useBillsView();
  const toggle = useKashStore((s) => s.toggleBillPaid);
  const openSheet = useKashStore((s) => s.openSheet);
  const openEdit = useKashStore((s) => s.openEdit);
  const summary = useBillsSummary();
  if (bills.length === 0) {
    return (
      <View testID="accounts-bills">
        <EmptyState icon="calendar" title="Nenhuma conta fixa" description="Aluguel, internet, streaming: cadastre o que vence todo mês e nunca mais esqueça." actionLabel="Nova conta fixa" onAction={() => openSheet('addBill')} testID="bills-empty-state" />
      </View>
    );
  }
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
        Toque pra marcar como paga · segure pra editar
      </Text>
      <View style={{ gap: 10, marginTop: 10 }}>
        {bills.map(({ bill: b, sourceName }) => (
          <Pressable
            key={b.id}
            onPress={() => toggle(b.id)}
            onLongPress={() => openEdit({ kind: 'bill', id: b.id })}
            testID={`bill-${b.id}`}
            haptic="light"
            pressedOpacity={0.8}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: b.paid }}
            accessibilityLabel={`${b.name}, ${b.paid ? 'paga' : `vence dia ${b.dueDay}`}${sourceName ? `, cobrada em ${sourceName}` : ''}`}
            accessibilityHint="Toque marca como paga; toque longo edita"
          >
            <Card radius="card" padding={[14, 16]} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, opacity: b.paid ? 0.55 : 1 }}>
              <CheckCircle checked={b.paid} testID={`bill-${b.id}-check`} />
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text variant="title" numberOfLines={1} style={b.paid ? { textDecorationLine: 'line-through' } : null}>
                  {b.name}
                </Text>
                <Text variant="meta" color="muted" numberOfLines={1} testID={`bill-${b.id}-status`}>
                  {b.paid ? 'Paga' : `Vence dia ${b.dueDay}`}
                  {sourceName ? ` · ${sourceName}` : ''}
                </Text>
              </View>
              <Text variant="valueLg">{formatBRL(b.amount)}</Text>
            </Card>
          </Pressable>
        ))}
        <DashedButton label="+ Nova conta fixa" onPress={() => openSheet('addBill')} testID="bills-add" />
      </View>
    </View>
  );
}
