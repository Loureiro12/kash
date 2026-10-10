'use client';

import { formatBRL, toISODate, transferLegs, transferPreview } from '@kash/domain';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { confirmDelete } from '@/components/app/Confirm';
import { Modal, modalStyles as m } from '@/components/app/Modal';
import { Button, Chip, ChipGroup, Field, TextInput, uiStyles } from '@/components/app/ui';
import { useKashActions } from '@/kash/actions';
import { useKash } from '@/kash/data';
import { amountFromDigits, digitsFrom } from '@/kash/money';
import { routes } from '@/features/app/nav';

/** Transferir entre contas / editar ou excluir uma transferência (as duas pernas juntas). */
export function TransferModal({ transferId, fromId, onClose }: { transferId?: string; fromId?: string; onClose: () => void }) {
  const snap = useKash();
  const actions = useKashActions();
  const [now] = useState(() => new Date());
  const today = toISODate(now);
  const accounts = snap.accounts;
  const editing = useMemo(() => (transferId ? transferLegs(snap.txs, transferId) : null), [snap.txs, transferId]);

  const initialFrom = editing?.out.sourceId ?? fromId ?? accounts[0]?.id ?? '';
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(editing?.into.sourceId ?? accounts.find((a) => a.id !== initialFrom)?.id ?? '');
  const [digits, setDigits] = useState(editing ? String(Math.round(Math.abs(editing.out.amount) * 100)) : '');
  const [note, setNote] = useState(editing && editing.out.title !== 'Transferência' ? editing.out.title : '');
  const [date, setDate] = useState(editing?.out.date ?? today);
  const [saving, setSaving] = useState(false);

  const amount = amountFromDigits(digits);
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= today;
  const canSave = amount > 0 && !!from && !!to && from !== to && validDate;
  const preview = canSave ? transferPreview(accounts, from, to, amount, editing) : null;
  const nameOf = (id: string) => accounts.find((a) => a.id === id)?.name ?? '';
  const title = editing ? 'Editar transferência' : 'Transferir entre contas';

  const pickFrom = (id: string) => {
    setFrom(id);
    if (id === to) setTo(accounts.find((a) => a.id !== id)?.id ?? '');
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave || saving) return;
    setSaving(true);
    const ok = await actions.saveTransfer(transferId ?? null, { fromAccountId: from, toAccountId: to, amount, date, title: note });
    setSaving(false);
    if (ok) onClose();
  };

  const onDelete = async () => {
    if (!editing) return;
    if (!(await confirmDelete('Excluir transferência?', `O valor volta para ${nameOf(editing.out.sourceId)}. Você pode desfazer logo em seguida.`))) return;
    onClose();
    await actions.deleteTransaction(editing.out, 'single');
  };

  if (accounts.length < 2 || (transferId && !editing)) {
    return (
      <Modal title={title} onClose={onClose} testID="modal-transfer">
        <p className={m.note} data-testid="transfer-unavailable">
          {transferId ? 'Essa transferência não está mais disponível.' : 'Pra transferir, você precisa de pelo menos duas contas bancárias (ex.: corrente e poupança).'}
        </p>
        {!transferId ? (
          <Link href={routes.accounts} className={`${uiStyles.btn} ${uiStyles.surface} ${uiStyles.md}`} onClick={onClose}>
            Ver contas
          </Link>
        ) : null}
      </Modal>
    );
  }

  return (
    <Modal
      title={title}
      onClose={onClose}
      testID="modal-transfer"
      footer={
        <>
          <Button type="submit" form="transfer-form" disabled={!canSave} loading={saving} testID="transfer-save">
            {editing ? 'Salvar alterações' : amount > 0 ? `Transferir ${formatBRL(amount)}` : 'Transferir'}
          </Button>
          {editing ? (
            <Button variant="dangerSoft" size="md" onClick={() => void onDelete()} testID="transfer-delete">
              Excluir transferência
            </Button>
          ) : null}
        </>
      }
    >
      <form id="transfer-form" className={m.body} onSubmit={(e) => void onSubmit(e)} noValidate>
        <Field label="Valor" htmlFor="transfer-amount">
          <input
            id="transfer-amount"
            className={m.amount}
            inputMode="numeric"
            autoComplete="off"
            placeholder="R$ 0,00"
            value={amount > 0 ? formatBRL(amount) : ''}
            onChange={(e) => setDigits(digitsFrom(e.target.value))}
            data-testid="transfer-amount"
            data-autofocus
          />
        </Field>
        <ChipGroup label="De" testID="transfer-from">
          {accounts.map((a) => (
            <Chip key={a.id} label={`${a.name} · ${formatBRL(a.balance)}`} soft selected={from === a.id} onSelect={() => pickFrom(a.id)} testID={`transfer-from-${a.id}`} />
          ))}
        </ChipGroup>
        <ChipGroup label="Para" testID="transfer-to">
          {accounts
            .filter((a) => a.id !== from)
            .map((a) => (
              <Chip key={a.id} label={a.name} soft selected={to === a.id} onSelect={() => setTo(a.id)} testID={`transfer-to-${a.id}`} />
            ))}
        </ChipGroup>
        {preview ? (
          <p className={`${m.note} ${preview.fromNegative ? m.noteNeg : ''}`} data-testid="transfer-preview" aria-live="polite">
            {nameOf(from)} fica com {preview.fromNegative ? '−' : ''}
            {formatBRL(preview.fromAfter)} · {nameOf(to)} fica com {formatBRL(preview.toAfter)}.
            {preview.fromNegative ? ' A origem fica negativa; dá pra transferir mesmo assim.' : ''}
          </p>
        ) : null}
        <div className={m.grid2}>
          <TextInput label="Descrição (opcional)" placeholder="ex.: guardar pra reserva" value={note} onChange={(e) => setNote(e.target.value)} maxLength={80} testID="transfer-note" />
          <TextInput label="Data" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} error={validDate ? null : 'Escolha uma data até hoje.'} testID="transfer-date" />
        </div>
        <p className={m.note}>Transferência não conta como gasto nem como entrada: o dinheiro só muda de conta.</p>
      </form>
    </Modal>
  );
}
