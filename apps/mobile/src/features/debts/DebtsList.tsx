import { debtChargeMessage, debtDueLabel, debtsSummary, formatBRL, type Debt } from '@kash/domain';
import React, { useMemo } from 'react';
import { Alert, Share, View } from 'react-native';
import { Button, Card, DashedButton, EmptyState, Pressable, Text, useTheme } from '@/design-system';
import { now } from '@/lib/clock';
import { useKashStore, useMoney } from '@/store';

/** Contas › A receber: quanto te devem, quem está atrasado, cobrar e marcar como recebido. */
export function DebtsList() {
  const { colors } = useTheme();
  const debts = useKashStore((s) => s.debts);
  const accounts = useKashStore((s) => s.accounts);
  const openSheet = useKashStore((s) => s.openSheet);
  const openEdit = useKashStore((s) => s.openEdit);
  const settleDebt = useKashStore((s) => s.settleDebt);
  const unsettleDebt = useKashStore((s) => s.unsettleDebt);
  const showToast = useKashStore((s) => s.showToast);
  const money = useMoney();
  const today = now();
  const summary = useMemo(() => debtsSummary(debts, today), [debts, today]);

  const charge = (d: Debt) => void Share.share({ message: debtChargeMessage(d, today) });

  const settle = (d: Debt) => {
    const done = (accountId: string | null, name?: string) => {
      settleDebt(d.id, accountId);
      showToast(name ? `${formatBRL(d.amount)} de ${d.person} entraram em ${name}` : `${d.person} pagou`, { label: 'Desfazer', onPress: () => unsettleDebt(d.id) });
    };
    Alert.alert(`${d.person} pagou ${formatBRL(d.amount)}?`, 'Lançar a entrada numa conta? (Se o dinheiro já entrou e você lançou, escolha só marcar.)', [
      ...accounts.slice(0, 3).map((a) => ({ text: `Entrou em ${a.name}`, onPress: () => done(a.id, a.name) })),
      { text: 'Só marcar como pago', onPress: () => done(null) },
      { text: 'Cancelar', style: 'cancel' as const },
    ]);
  };

  if (debts.length === 0) {
    return (
      <View testID="accounts-debts">
        <EmptyState
          icon="wallet"
          title="Ninguém te deve"
          description="Emprestou um dinheiro ou dividiu uma conta? Anote aqui e o Kash te lembra de cobrar."
          actionLabel="Anotar"
          onAction={() => openSheet('debt')}
          testID="debts-empty"
        />
      </View>
    );
  }

  return (
    <View testID="accounts-debts">
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
        <Card radius="card" padding={16} style={{ flex: 1, gap: 4 }}>
          <Text variant="micro" color="muted">
            A receber
          </Text>
          <Text variant="amountMedium" color="accentText" testID="debts-total">
            {money(summary.pendingTotal)}
          </Text>
        </Card>
        <Card radius="card" padding={16} style={{ flex: 1, gap: 4 }}>
          <Text variant="micro" color="muted">
            Atrasados
          </Text>
          <Text variant="amountMedium" color={summary.overdueCount ? 'neg' : 'text'} testID="debts-overdue">
            {summary.overdueCount}
          </Text>
        </Card>
      </View>

      <View style={{ gap: 10, marginTop: 16 }}>
        {summary.pending.map((d) => {
          const label = debtDueLabel(d, today);
          const late = !!d.dueDate && label.startsWith('atrasado');
          return (
            <Pressable key={d.id} onPress={() => openEdit({ kind: 'debt', id: d.id })} accessibilityRole="button" accessibilityLabel={`${d.person} te deve ${formatBRL(d.amount)}, ${label}`} accessibilityHint="Abre para editar" testID={`debt-${d.id}`}>
              <Card radius="card" padding={[14, 16]} style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text variant="title" numberOfLines={1}>
                      {d.person}
                    </Text>
                    <Text variant="meta" color={late ? 'neg' : 'muted'} numberOfLines={1} testID={`debt-${d.id}-status`}>
                      {[d.description, d.kind === 'split' ? 'conta dividida' : 'empréstimo', label].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  <Text variant="valueLg">{money(d.amount)}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button label="Cobrar" variant="secondary" size="xs" fullWidth={false} onPress={() => charge(d)} testID={`debt-${d.id}-charge`} />
                  <Button label="Recebi" size="xs" fullWidth={false} onPress={() => settle(d)} testID={`debt-${d.id}-settle`} />
                </View>
              </Card>
            </Pressable>
          );
        })}
        <DashedButton label="+ Anotar" onPress={() => openSheet('debt')} testID="debts-add" />
      </View>

      {summary.settled.length ? (
        <View style={{ marginTop: 20, gap: 6 }} testID="debts-settled">
          <Text variant="metaMedium" color="muted">
            Recebidos
          </Text>
          {summary.settled.slice(0, 10).map((d) => (
            <View key={d.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line }}>
              <Text variant="body" color="muted" style={{ flex: 1 }} numberOfLines={1}>
                {d.person} · {money(d.amount)} · {debtDueLabel(d, today)}
              </Text>
              <Button label="Desfazer" variant="ghost" size="xs" fullWidth={false} onPress={() => unsettleDebt(d.id)} testID={`debt-${d.id}-undo`} />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
