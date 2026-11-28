import { defaultDebtDue, relativeDayLabel, splitShare, toISODate } from '@kash/domain';
import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { AmountField, BottomSheet, Button, Calendar, Chip, Input, SegmentedControl, Text } from '@/design-system';
import { now } from '@/lib/clock';
import { useKashStore, type DebtDraft } from '@/store';

/** Sheet — Alguém me deve: quem, quanto, do quê, se foi empréstimo ou conta dividida, e quando cobrar. */
export function DebtSheet() {
  const visible = useKashStore((s) => s.ui.sheet === 'debt');
  const nonce = useKashStore((s) => s.ui.sheetNonce);
  const editingId = useKashStore((s) => (s.ui.editing?.kind === 'debt' ? s.ui.editing.id : null));
  const draft = useKashStore((s) => (s.ui.editing ? null : s.ui.debtDraft));
  const closeSheet = useKashStore((s) => s.closeSheet);
  return <DebtForm key={`${nonce}-${editingId ?? 'new'}`} visible={visible} editingId={editingId} draft={draft} onClose={closeSheet} />;
}

function DebtForm({ visible, editingId, draft, onClose }: { visible: boolean; editingId: string | null; draft: DebtDraft | null; onClose: () => void }) {
  const editing = useKashStore((s) => (editingId ? (s.debts.find((d) => d.id === editingId) ?? null) : null));
  const addDebt = useKashStore((s) => s.addDebt);
  const updateDebt = useKashStore((s) => s.updateDebt);
  const removeDebt = useKashStore((s) => s.removeDebt);
  const showToast = useKashStore((s) => s.showToast);
  const today = now();
  const todayISO = toISODate(today);

  const [person, setPerson] = useState(editing?.person ?? '');
  const [people, setPeople] = useState(2);
  const [amount, setAmount] = useState(editing ? editing.amount : draft ? splitShare(draft.totalCents, 2) / 100 : 0);
  const [description, setDescription] = useState(editing?.description ?? draft?.description ?? '');
  const [kind, setKind] = useState<'lent' | 'split'>(editing?.kind ?? (draft ? 'split' : 'lent'));
  const [due, setDue] = useState<string | null>(editing ? editing.dueDate : defaultDebtDue(today));
  const [calendarOpen, setCalendarOpen] = useState(false);

  const canSave = person.trim().length > 0 && amount > 0;
  const changePeople = (n: number) => {
    const next = Math.max(2, Math.min(20, n));
    setPeople(next);
    if (draft) setAmount(splitShare(draft.totalCents, next) / 100);
  };

  const onSave = () => {
    if (!canSave) return;
    const input = { person, description, amountCents: Math.round(amount * 100), kind, dueDate: due };
    if (editing) {
      updateDebt(editing.id, input);
      showToast('Atualizado');
      return;
    }
    addDebt(input);
    showToast(due ? `Anotado: ${person.trim()} · lembrete ${relativeDayLabel(due, today).toLowerCase()}` : `Anotado: ${person.trim()}`);
  };

  const onDelete = () => {
    if (!editing) return;
    Alert.alert('Excluir?', `${editing.person} sai da lista de quem te deve.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => removeDebt(editing.id) },
    ]);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={editing ? 'Editar' : 'Alguém me deve'}
      testID="sheet-debt"
      gap={12}
      footer={
        <>
          <Button label={editing ? 'Salvar alterações' : 'Anotar'} onPress={onSave} disabled={!canSave} testID="debt-save" haptic="medium" />
          {editing ? <Button label="Excluir" variant="dangerSoft" size="md" onPress={onDelete} testID="debt-delete" /> : null}
        </>
      }
    >
      <SegmentedControl
        value={kind}
        onChange={setKind}
        options={[
          { value: 'lent', label: 'Emprestei', testID: 'debt-kind-lent' },
          { value: 'split', label: 'Dividi uma conta', testID: 'debt-kind-split' },
        ]}
        testID="debt-kind"
      />
      <AmountField value={amount} onChangeValue={setAmount} testID="debt-amount" accessibilityLabel="Quanto a pessoa te deve" />
      {draft && kind === 'split' && !editing ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }} testID="debt-split">
          <Text variant="meta" color="muted">
            Conta de {(draft.totalCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ÷
          </Text>
          <Chip label="−" tone="soft" height={30} onPress={() => changePeople(people - 1)} testID="debt-people-dec" />
          <Text variant="bodySemibold" testID="debt-people">
            {people} pessoas
          </Text>
          <Chip label="+" tone="soft" height={30} onPress={() => changePeople(people + 1)} testID="debt-people-inc" />
        </View>
      ) : null}
      <Input height={46} placeholder="Quem? (ex.: João)" value={person} onChangeText={setPerson} maxLength={40} autoCapitalize="words" testID="debt-person" />
      <Input height={46} placeholder={kind === 'split' ? 'Do quê? (ex.: jantar de sexta)' : 'Pra quê? (opcional)'} value={description} onChangeText={setDescription} maxLength={60} testID="debt-description" />
      <Text variant="microMedium" color="muted" style={{ paddingLeft: 4 }}>
        Lembrete para cobrar
      </Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Chip label="Sem lembrete" tone="soft" selected={due === null} onPress={() => { setDue(null); setCalendarOpen(false); }} testID="debt-due-none" />
        <Chip
          label={due ? relativeDayLabel(due, today) : 'Escolher dia'}
          tone="soft"
          selected={due !== null}
          onPress={() => {
            if (!due) setDue(defaultDebtDue(today));
            setCalendarOpen((o) => !o);
          }}
          testID="debt-due"
        />
      </View>
      {calendarOpen && due ? (
        <Calendar
          value={due}
          onChange={(iso) => {
            setDue(iso);
            setCalendarOpen(false);
          }}
          min={todayISO}
          today={todayISO}
          testID="debt-calendar"
        />
      ) : null}
    </BottomSheet>
  );
}
