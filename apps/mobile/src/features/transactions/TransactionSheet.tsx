import React, { useMemo, useState } from 'react';
import { Alert, Keyboard, ScrollView, View } from 'react-native';
import { BottomSheet, Button, Chip, DateStepper, Input, Keypad, Pressable, SegmentedControl, Text, categoryColors, useTheme, type KeypadKey } from '@/design-system';
import { addDays, applyKeypadKey, CATEGORIES, digitsToAmount, formatBRL, installmentPreview, isAccountId, isCardId, parseISODate, relativeDayLabel, toISODate, type Category, type Tx, type TxKind } from '@kash/domain';
import { now } from '@/lib/clock';
import { useKashStore, useSourceOptions } from '@/store';

const MAX_INSTALLMENTS = 24;

/**
 * Sheet — Lançar gasto / entrada, e edição de um lançamento existente.
 * O formulário é remontado a cada abertura (key = sheetNonce) e lê o lançamento em edição do store.
 */
export function TransactionSheet() {
  const visible = useKashStore((s) => s.ui.sheet === 'expense');
  const nonce = useKashStore((s) => s.ui.sheetNonce);
  const editingId = useKashStore((s) => s.ui.editingTxId);
  const closeSheet = useKashStore((s) => s.closeSheet);
  return <TransactionForm key={`${nonce}-${editingId ?? 'new'}`} visible={visible} editingId={editingId} onClose={closeSheet} />;
}

function TransactionForm({ visible, editingId, onClose }: { visible: boolean; editingId: string | null; onClose: () => void }) {
  const { colors } = useTheme();
  const editing: Tx | null = useKashStore((s) => (editingId ? (s.txs.find((t) => t.id === editingId) ?? null) : null));
  const plan = useKashStore((s) => (editing?.planId ? (s.plans.find((p) => p.id === editing.planId) ?? null) : null));
  const addTransaction = useKashStore((s) => s.addTransaction);
  const updateTransaction = useKashStore((s) => s.updateTransaction);
  const deleteTransaction = useKashStore((s) => s.deleteTransaction);
  const undoDelete = useKashStore((s) => s.undoDelete);
  const showToast = useKashStore((s) => s.showToast);
  const sources = useSourceOptions();
  const accountSources = sources.filter((s) => !s.isCard);
  const today = now();
  const todayISO = toISODate(today);

  const [kind, setKind] = useState<TxKind>(editing ? (editing.amount < 0 ? 'expense' : 'income') : 'expense');
  const [digits, setDigits] = useState(editing ? String(Math.round(Math.abs(editing.amount) * 100)) : '');
  const isInvoicePayment = editing?.category === 'Fatura';
  const [category, setCategory] = useState<Category>(editing && editing.category !== 'Entrada' && editing.category !== 'Fatura' ? editing.category : 'Comida');
  const [sourceId, setSourceId] = useState(editing?.sourceId ?? sources[0]?.id ?? '');
  const [note, setNote] = useState(editing?.title ?? '');
  const [installments, setInstallments] = useState(1);
  const [date, setDate] = useState(editing?.date ?? todayISO);

  const isIncome = kind === 'income';
  const amount = digitsToAmount(digits);
  const srcIsCard = isCardId(sourceId);
  const effectiveSource = isIncome && srcIsCard ? (accountSources[0]?.id ?? '') : sourceId;
  const n = !editing && !isIncome && srcIsCard ? installments : 1;
  const preview = useMemo(() => installmentPreview(amount, n, today), [amount, n, today]);
  const canSave = amount > 0 && effectiveSource.length > 0 && (!isIncome || isAccountId(effectiveSource));
  const isToday = date === todayISO;

  const onKey = (key: KeypadKey) => {
    Keyboard.dismiss();
    setDigits((d) => applyKeypadKey(d, key));
  };
  const shiftDate = (days: number) => setDate((d) => {
    const next = toISODate(addDays(parseISODate(d), days));
    return next > todayISO ? todayISO : next;
  });

  const onSave = () => {
    if (!canSave) return;
    Keyboard.dismiss();
    if (editing) {
      updateTransaction(editing.id, { title: note, category, amountCents: Math.round(amount * 100), sourceId: effectiveSource, date });
      showToast('Lançamento atualizado');
      return;
    }
    addTransaction({ kind, amountCents: Math.round(amount * 100), category, sourceId: effectiveSource, note, installments: n, date });
    showToast(isIncome ? `${formatBRL(amount)} de entrada registrados` : n > 1 ? `${n}x de ${formatBRL(preview.per)} no cartão` : `${formatBRL(amount)} lançado em ${category}`);
  };

  const doDelete = (scope: 'single' | 'plan') => {
    if (!editing) return;
    deleteTransaction(editing.id, scope);
    showToast(scope === 'plan' ? 'Parcelamento excluído' : 'Lançamento excluído', { label: 'Desfazer', onPress: undoDelete });
  };

  const onDelete = () => {
    if (!editing) return;
    if (plan) {
      Alert.alert('Excluir parcela?', `"${plan.title}" tem ${plan.installments} parcelas.`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Só esta parcela', onPress: () => doDelete('single') },
        { text: 'Todas as parcelas', style: 'destructive', onPress: () => doDelete('plan') },
      ]);
      return;
    }
    Alert.alert('Excluir lançamento?', 'Você pode desfazer logo em seguida.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => doDelete('single') },
    ]);
  };

  const title = editing ? 'Editar lançamento' : isIncome ? 'Registrar entrada' : 'Lançar gasto';
  const ctaLabel = editing ? 'Salvar alterações' : isIncome ? 'Salvar entrada' : 'Salvar gasto';

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      headerContent={
        !editing ? (
          <SegmentedControl<TxKind>
            compact
            value={kind}
            onChange={(k) => {
              setKind(k);
              if (k === 'income' && isCardId(sourceId)) setSourceId(accountSources[0]?.id ?? '');
            }}
            options={[
              { value: 'expense', label: 'Gasto', testID: 'tx-kind-expense' },
              { value: 'income', label: 'Entrada', testID: 'tx-kind-income' },
            ]}
            testID="tx-kind"
            style={{ alignSelf: 'flex-start' }}
          />
        ) : undefined
      }
      testID="sheet-expense"
      gap={12}
      footer={
        <>
          <Button label={ctaLabel} onPress={onSave} disabled={!canSave} testID="expense-save" haptic="medium" />
          {editing ? <Button label="Excluir lançamento" variant="dangerSoft" size="md" onPress={onDelete} testID="expense-delete" /> : null}
        </>
      }
    >
      <View style={{ alignItems: 'center', paddingVertical: 2 }}>
        <Text variant="amountSheet" color={amount > 0 ? (isIncome ? 'accentText' : 'text') : 'muted'} testID="expense-amount">
          {isIncome && amount > 0 ? '+ ' : ''}
          {formatBRL(amount)}
        </Text>
      </View>

      {!isIncome && !isInvoicePayment ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled">
          {CATEGORIES.map((c) => (
            <Chip key={c} label={c} dotColor={categoryColors[c]} selected={category === c} onPress={() => setCategory(c)} testID={`chip-cat-${c}`} />
          ))}
        </ScrollView>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled">
        {(isIncome ? accountSources : sources).map((s) => (
          <Chip key={s.id} label={s.label} tone="soft" shape="rounded" height={34} selected={effectiveSource === s.id} onPress={() => setSourceId(s.id)} testID={`chip-src-${s.id}`} />
        ))}
      </ScrollView>

      {/* descrição + data na mesma linha para o keypad caber sem rolar */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Input containerStyle={{ flex: 1, minWidth: 0 }} height={46} placeholder={isIncome ? 'Descrição (ex.: freela)' : 'Descrição (ex.: lanche)'} value={note} onChangeText={setNote} testID="expense-note" returnKeyType="done" />
        <DateStepper
          compact
          label={relativeDayLabel(date, today)}
          isToday={isToday}
          onPrev={() => shiftDate(-1)}
          onNext={() => shiftDate(1)}
          nextDisabled={isToday}
          onToday={() => setDate(todayISO)}
          testID="expense-date"
        />
      </View>

      {!editing && !isIncome && srcIsCard ? (
        <View
          testID="expense-installments"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, height: 50, paddingLeft: 14, paddingRight: 6, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}
        >
          <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
            <Text variant="bodySemibold" testID="expense-installments-label">
              {n === 1 ? 'À vista' : `${n}x de ${formatBRL(preview.per)}`}
            </Text>
            <Text variant="micro" color="muted" numberOfLines={1}>
              {n === 1 ? 'Toque em + para parcelar' : `Última parcela em ${preview.lastMonth} · total ${formatBRL(amount)}`}
            </Text>
          </View>
          <StepButton label="−" onPress={() => setInstallments((v) => Math.max(1, v - 1))} testID="expense-inst-dec" accessibilityLabel="Menos parcelas" />
          <Text variant="value" style={{ minWidth: 30, textAlign: 'center' }} testID="expense-inst-n">
            {n}x
          </Text>
          <StepButton label="+" onPress={() => setInstallments((v) => Math.min(MAX_INSTALLMENTS, v + 1))} testID="expense-inst-inc" accessibilityLabel="Mais parcelas" />
        </View>
      ) : null}

      {editing && plan ? (
        <Text variant="meta" color="muted" testID="expense-plan-note">
          Parcela {plan.current} de {plan.installments} de “{plan.title}”. Alterar o valor muda só esta parcela.
        </Text>
      ) : null}

      <Keypad onKey={onKey} />
    </BottomSheet>
  );
}

function StepButton({ label, onPress, testID, accessibilityLabel }: { label: string; onPress: () => void; testID: string; accessibilityLabel: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      haptic="selection"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text variant="key" style={{ fontSize: 18 }}>
        {label}
      </Text>
    </Pressable>
  );
}
