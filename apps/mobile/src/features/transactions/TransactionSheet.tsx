import React, { useMemo, useState } from 'react';
import { Alert, Keyboard, ScrollView, View } from 'react-native';
import { BottomSheet, Button, Chip, DateStepper, Input, Keypad, Pressable, SegmentedControl, Text, useTheme, type KeypadKey } from '@/design-system';
import { addDays, applyKeypadKey, digitsToAmount, formatBRL, installmentSchedule, monthKey, monthKeyToDate, parseISODate, relativeDayLabel, round2, toISODate, type Category, type Tx, type TxKind } from '@kash/domain';
import { now } from '@/lib/clock';
import { useCategories, useKashStore, useSourceOptions } from '@/store';

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
  const { names: categoryNames, colors: categoryColorsMap } = useCategories();
  const defaultCategory = categoryNames.includes('Comida') ? 'Comida' : (categoryNames[0] ?? 'Outros');
  const [category, setCategory] = useState<Category>(editing && editing.category !== 'Entrada' && editing.category !== 'Fatura' ? editing.category : defaultCategory);
  const [sourceId, setSourceId] = useState(editing?.sourceId ?? sources[0]?.id ?? '');
  const [note, setNote] = useState(editing?.title ?? '');
  const [installments, setInstallments] = useState(1);
  const [date, setDate] = useState(editing?.date ?? todayISO);
  /** parcelado: mês da 1ª parcela (pode ser no passado) e se o valor digitado é o total ou o da parcela */
  const [firstMonth, setFirstMonth] = useState(monthKey(today));
  const [valueMode, setValueMode] = useState<'total' | 'parcela'>('total');

  const isIncome = kind === 'income';
  const typed = digitsToAmount(digits);
  const srcIsCard = sources.find((s) => s.id === sourceId)?.isCard ?? false;
  const effectiveSource = isIncome && srcIsCard ? (accountSources[0]?.id ?? '') : sourceId;
  const n = !editing && !isIncome && srcIsCard ? installments : 1;
  // no modo "parcela", o total é parcela × n
  const amount = n > 1 && valueMode === 'parcela' ? round2(typed * n) : typed;
  const preview = useMemo(() => installmentSchedule(amount, n, firstMonth, today), [amount, n, firstMonth, today]);
  const pastStart = n > 1 && preview.paid > 0;
  const canSave = amount > 0 && effectiveSource.length > 0 && (!isIncome || accountSources.some((s) => s.id === effectiveSource)) && !(n > 1 && preview.finished);
  const shiftMonth = (delta: number) =>
    setFirstMonth((m) => {
      const d = monthKeyToDate(m);
      d.setMonth(d.getMonth() + delta);
      const next = monthKey(d);
      const oldest = monthKey(new Date(today.getFullYear(), today.getMonth() - (MAX_INSTALLMENTS - 1), 1));
      return next > monthKey(today) ? monthKey(today) : next < oldest ? oldest : next;
    });
  const monthLabel = (key: string) => {
    const d = monthKeyToDate(key);
    return key === monthKey(today) ? 'Este mês' : `${d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}/${String(d.getFullYear()).slice(2)}`;
  };
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
    addTransaction({ kind, amountCents: Math.round(amount * 100), category, sourceId: effectiveSource, note, installments: n, date, ...(n > 1 ? { firstInstallmentMonth: firstMonth } : {}) });
    showToast(
      isIncome
        ? `${formatBRL(amount)} de entrada registrados`
        : pastStart
          ? `Parcela ${preview.current}/${n} lançada · ${preview.paid} já pagas`
          : n > 1
            ? `${n}x de ${formatBRL(preview.per)} no cartão`
            : `${formatBRL(amount)} lançado em ${category}`,
    );
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
              if (k === 'income' && srcIsCard) setSourceId(accountSources[0]?.id ?? '');
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
          {categoryNames.map((c) => (
            <Chip key={c} label={c} dotColor={categoryColorsMap[c]} selected={category === c} onPress={() => setCategory(c)} testID={`chip-cat-${c}`} />
          ))}
        </ScrollView>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled">
        {(isIncome ? accountSources : editing && plan ? sources.filter((src) => src.isCard) : sources).map((s) => (
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
              {n === 1 ? 'Toque em + para parcelar' : `até ${preview.lastMonth} · total ${formatBRL(amount)}`}
            </Text>
          </View>
          <StepButton label="−" onPress={() => setInstallments((v) => Math.max(1, v - 1))} testID="expense-inst-dec" accessibilityLabel="Menos parcelas" />
          <Text variant="value" style={{ minWidth: 30, textAlign: 'center' }} testID="expense-inst-n">
            {n}x
          </Text>
          <StepButton label="+" onPress={() => setInstallments((v) => Math.min(MAX_INSTALLMENTS, v + 1))} testID="expense-inst-inc" accessibilityLabel="Mais parcelas" />
        </View>
      ) : null}

      {!editing && !isIncome && srcIsCard && n > 1 ? (
        <View style={{ gap: 8 }} testID="expense-plan-start">
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="microMedium" color="muted" style={{ paddingLeft: 4 }}>
                1ª parcela em
              </Text>
              <DateStepper
                label={monthLabel(firstMonth)}
                isToday={firstMonth === monthKey(today)}
                onPrev={() => shiftMonth(-1)}
                onNext={() => shiftMonth(1)}
                nextDisabled={firstMonth === monthKey(today)}
                prevLabel="Mês anterior"
                nextLabel="Próximo mês"
                testID="expense-first-month"
              />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="microMedium" color="muted" style={{ paddingLeft: 4 }}>
                Valor digitado
              </Text>
              <SegmentedControl
                value={valueMode}
                onChange={setValueMode}
                options={[
                  { value: 'total', label: 'Total', testID: 'expense-value-mode-total' },
                  { value: 'parcela', label: 'Parcela', testID: 'expense-value-mode-parcela' },
                ]}
                testID="expense-value-mode"
              />
            </View>
          </View>
          {preview.finished ? (
            <Text variant="meta" color="neg" testID="expense-plan-summary">
              Essa compra já foi toda paga: a última parcela caiu em {monthLabel(monthKey(new Date(monthKeyToDate(firstMonth).getFullYear(), monthKeyToDate(firstMonth).getMonth() + n - 1, 1)))}.
            </Text>
          ) : pastStart ? (
            <Text variant="meta" color="muted" testID="expense-plan-summary">
              {preview.paid === 1 ? '1 parcela já paga' : `${preview.paid} parcelas já pagas`} ({monthLabel(firstMonth)}
              {preview.paid > 1 ? ` a ${monthLabel(monthKey(new Date(today.getFullYear(), today.getMonth() - 1, 1)))}` : ''}) fica{preview.paid > 1 ? 'm' : ''} fora. Lança a {preview.current}/{n} agora; {preview.remaining === 1 ? 'é a última' : `faltam ${preview.remaining} até ${preview.lastMonth}`}: {formatBRL(preview.remainingAmount)}.
            </Text>
          ) : null}
        </View>
      ) : null}

      {editing && plan ? (
        <Text variant="meta" color="muted" testID="expense-plan-note">
          Parcela de “{plan.title}” ({plan.installments}x). Alterar o valor muda só esta parcela; trocar o cartão leva o parcelamento inteiro.
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
