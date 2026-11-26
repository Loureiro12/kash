import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Keyboard, ScrollView, View, type TextInput } from 'react-native';
import { AmountField, BottomSheet, Button, Chip, DateButton, Input, Text } from '@/design-system';
import { formatBRL, relativeDayLabel, toISODate, transferLegs, transferPreview } from '@kash/domain';
import { now } from '@/lib/clock';
import { useKashStore } from '@/store';
import { TxDatePicker, TxKindSwitch } from './TxSheetParts';

/**
 * Sheet — Transferir entre contas (e editar/excluir uma transferência). As duas pernas
 * (saída na origem, entrada no destino) são criadas, editadas e excluídas juntas.
 */
export function TransferSheet() {
  const visible = useKashStore((s) => s.ui.sheet === 'transfer');
  const nonce = useKashStore((s) => s.ui.sheetNonce);
  const transferId = useKashStore((s) => s.ui.transferId);
  const closeSheet = useKashStore((s) => s.closeSheet);
  return <TransferForm key={`${nonce}-${transferId ?? 'new'}`} visible={visible} transferId={transferId} onClose={closeSheet} />;
}

function TransferForm({ visible, transferId, onClose }: { visible: boolean; transferId: string | null; onClose: () => void }) {
  const accounts = useKashStore((s) => s.accounts);
  const txs = useKashStore((s) => s.txs);
  const addTransfer = useKashStore((s) => s.addTransfer);
  const updateTransfer = useKashStore((s) => s.updateTransfer);
  const deleteTransaction = useKashStore((s) => s.deleteTransaction);
  const undoDelete = useKashStore((s) => s.undoDelete);
  const showToast = useKashStore((s) => s.showToast);
  const openNewTransaction = useKashStore((s) => s.openNewTransaction);
  // o que veio digitado do sheet de gasto/entrada (só em transferência nova)
  const draft = useKashStore((s) => (transferId ? null : s.ui.transferDraft));
  const editing = useMemo(() => (transferId ? transferLegs(txs, transferId) : null), [txs, transferId]);
  const today = now();
  const todayISO = toISODate(today);

  const initialFrom = editing?.out.sourceId ?? accounts[0]?.id ?? '';
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(editing?.into.sourceId ?? accounts.find((a) => a.id !== initialFrom)?.id ?? '');
  const [amount, setAmount] = useState(editing ? Math.abs(editing.out.amount) : draft?.amountCents ? draft.amountCents / 100 : 0);
  const [note, setNote] = useState(editing ? (editing.out.title !== 'Transferência' ? editing.out.title : '') : (draft?.note ?? ''));
  const [date, setDate] = useState(editing?.out.date ?? draft?.date ?? todayISO);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const amountRef = useRef<TextInput>(null);

  const canSave = amount > 0 && !!from && !!to && from !== to;
  const preview = canSave ? transferPreview(accounts, from, to, amount, editing) : null;
  const nameOf = (id: string) => accounts.find((a) => a.id === id)?.name ?? '';

  const pickFrom = (id: string) => {
    setFrom(id);
    if (id === to) setTo(accounts.find((a) => a.id !== id)?.id ?? '');
  };
  const toggleCalendar = () => {
    Keyboard.dismiss();
    setCalendarOpen((o) => !o);
  };
  const pickDate = (iso: string) => {
    setDate(iso);
    setCalendarOpen(false);
  };
  const enough = accounts.length >= 2;

  // transferência nova sem valor: abre com o teclado numérico
  useEffect(() => {
    if (!visible || editing || amount > 0 || !enough) return;
    const t = setTimeout(() => amountRef.current?.focus(), 320);
    return () => clearTimeout(t);
    // só na abertura
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const onSave = () => {
    if (!canSave) return;
    const input = { fromAccountId: from, toAccountId: to, amountCents: Math.round(amount * 100), date, note };
    if (editing && transferId) {
      updateTransfer(transferId, input);
      showToast('Transferência atualizada');
      return;
    }
    addTransfer(input);
    showToast(`${formatBRL(amount)} transferidos`);
  };

  const onDelete = () => {
    if (!editing) return;
    Alert.alert('Excluir transferência?', `O valor volta para ${nameOf(editing.out.sourceId)}. Você pode desfazer logo em seguida.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          deleteTransaction(editing.out.id);
          showToast('Transferência excluída', { label: 'Desfazer', onPress: undoDelete });
        },
      },
    ]);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={editing ? 'Editar transferência' : 'Transferir entre contas'}
      headerContent={
        !editing ? (
          <TxKindSwitch
            value="transfer"
            onChange={(k) => {
              if (k === 'transfer') return;
              // volta para gasto/entrada levando o que já foi digitado
              openNewTransaction(k, { amountCents: amount > 0 ? Math.round(amount * 100) : undefined, note: note || undefined, date });
            }}
          />
        ) : undefined
      }
      testID="sheet-transfer"
      gap={12}
      footer={
        enough ? (
          <>
            <Button label={editing ? 'Salvar alterações' : amount > 0 ? `Transferir ${formatBRL(amount)}` : 'Transferir'} onPress={onSave} disabled={!canSave} testID="transfer-save" haptic="medium" />
            {editing ? <Button label="Excluir transferência" variant="dangerSoft" size="md" onPress={onDelete} testID="transfer-delete" /> : null}
          </>
        ) : undefined
      }
    >
      {!enough ? (
        <Text variant="body" color="muted" testID="transfer-unavailable">
          Pra transferir, você precisa de pelo menos duas contas bancárias (ex.: corrente e poupança).
        </Text>
      ) : (
        <>
          <AmountField ref={amountRef} value={amount} onChangeValue={setAmount} testID="transfer-amount" accessibilityLabel="Valor da transferência" onFocus={() => setCalendarOpen(false)} />

          <Text variant="metaMedium" color="muted">
            De
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled">
            {accounts.map((a) => (
              <Chip key={a.id} label={`${a.name} · ${formatBRL(a.balance)}`} tone="soft" shape="rounded" height={34} selected={from === a.id} onPress={() => pickFrom(a.id)} testID={`transfer-from-${a.id}`} />
            ))}
          </ScrollView>
          <Text variant="metaMedium" color="muted">
            Para
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled">
            {accounts
              .filter((a) => a.id !== from)
              .map((a) => (
                <Chip key={a.id} label={a.name} tone="soft" shape="rounded" height={34} selected={to === a.id} onPress={() => setTo(a.id)} testID={`transfer-to-${a.id}`} />
              ))}
          </ScrollView>

          {preview ? (
            <Text variant="meta" color={preview.fromNegative ? 'neg' : 'muted'} testID="transfer-preview">
              {nameOf(from)} fica com {preview.fromNegative ? '−' : ''}
              {formatBRL(preview.fromAfter)} · {nameOf(to)} fica com {formatBRL(preview.toAfter)}.{preview.fromNegative ? ' A origem fica negativa.' : ''}
            </Text>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Input containerStyle={{ flex: 1, minWidth: 0 }} height={46} placeholder="Descrição (opcional)" value={note} onChangeText={setNote} onFocus={() => setCalendarOpen(false)} testID="transfer-note" returnKeyType="done" />
            <DateButton label={relativeDayLabel(date, today)} open={calendarOpen} onPress={toggleCalendar} testID="transfer-date" />
          </View>
          {calendarOpen ? <TxDatePicker value={date} today={today} onPick={pickDate} testID="transfer-date-picker" /> : null}
        </>
      )}
    </BottomSheet>
  );
}
