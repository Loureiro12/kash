'use client';

import { categoryColorMap } from '@kash/domain';
import { useMemo, useState } from 'react';
import { confirmDelete } from '@/components/app/Confirm';
import { Modal, modalStyles as m } from '@/components/app/Modal';
import { Button, Chip, ChipGroup, DayInput, MoneyInput, parseDay, TextInput } from '@/components/app/ui';
import { useKashActions } from '@/kash/actions';
import { useKash } from '@/kash/data';
import { sourcesView } from '@/kash/views';

/** Nova conta fixa / editar — nome, valor, dia, categoria e onde é cobrada. */
export function BillModal({ id, onClose }: { id?: string; onClose: () => void }) {
  const snap = useKash();
  const actions = useKashActions();
  const editing = id ? (snap.bills.find((b) => b.id === id) ?? null) : null;
  const sources = useMemo(() => sourcesView(snap), [snap]);
  const names = snap.categories.map((c) => c.name);
  const colors = useMemo(() => categoryColorMap(snap.categories), [snap.categories]);
  const [name, setName] = useState(editing?.name ?? '');
  const [amount, setAmount] = useState(editing?.amount ?? 0);
  const [day, setDay] = useState(editing ? String(editing.dueDay) : '');
  const [category, setCategory] = useState(editing?.category ?? (names.includes('Assinaturas') ? 'Assinaturas' : (names[0] ?? 'Outros')));
  const [sourceId, setSourceId] = useState<string | null>(editing ? (editing.sourceId ?? null) : (sources[0]?.id ?? null));
  const [saving, setSaving] = useState(false);
  const dueDay = parseDay(day);
  const canSave = name.trim().length > 0 && amount > 0 && dueDay !== null;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave || saving || dueDay === null) return;
    setSaving(true);
    const ok = await actions.saveBill(editing?.id ?? null, { name, amount, dueDay, category, sourceId });
    setSaving(false);
    if (ok) onClose();
  };

  const onDelete = async () => {
    if (!editing) return;
    if (!(await confirmDelete('Excluir conta fixa?', 'Ela some das próximas contas e da previsão. Pagamentos já registrados continuam nos lançamentos.'))) return;
    if (await actions.deleteBill(editing.id, editing.name)) onClose();
  };

  return (
    <Modal
      title={editing ? 'Editar conta fixa' : 'Nova conta fixa'}
      onClose={onClose}
      testID="modal-bill"
      footer={
        <>
          <Button type="submit" form="bill-form" disabled={!canSave} loading={saving} testID="add-bill-save">
            {editing ? 'Salvar alterações' : 'Adicionar conta fixa'}
          </Button>
          {editing ? (
            <Button variant="dangerSoft" size="md" onClick={() => void onDelete()} testID="add-bill-delete">
              Excluir conta fixa
            </Button>
          ) : null}
        </>
      }
    >
      <form id="bill-form" className={m.body} onSubmit={(e) => void onSubmit(e)} noValidate>
        <TextInput label="Nome" placeholder="ex.: Streaming de vídeo" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} testID="add-bill-name" />
        <div className={m.grid2}>
          <MoneyInput label="Valor" value={amount} onChangeValue={setAmount} testID="add-bill-amount" />
          <DayInput label="Dia do vencimento" placeholder="ex.: 10" value={day} onChange={setDay} error={day && dueDay === null ? 'Entre 1 e 31' : null} testID="add-bill-day" />
        </div>
        <ChipGroup label="Cobrada em">
          <Chip label="Não informar" soft selected={sourceId === null} onSelect={() => setSourceId(null)} testID="add-bill-src-none" />
          {sources.map((s) => (
            <Chip key={s.id} label={s.label} soft selected={sourceId === s.id} onSelect={() => setSourceId(s.id)} testID={`add-bill-src-${s.id}`} />
          ))}
        </ChipGroup>
        <ChipGroup label="Categoria">
          {names.map((c) => (
            <Chip key={c} label={c} dotColor={colors[c]} selected={category === c} onSelect={() => setCategory(c)} testID={`add-bill-cat-${c}`} />
          ))}
        </ChipGroup>
        <p className={m.note}>Ao marcar como paga, o Kash lança o valor: na fatura, se for no cartão, ou no saldo, se for numa conta.</p>
      </form>
    </Modal>
  );
}
