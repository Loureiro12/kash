'use client';

import { ACCOUNT_KINDS, type AccountKind } from '@kash/domain';
import { useState } from 'react';
import { confirmDelete } from '@/components/app/Confirm';
import { accountColors } from '@/components/app/colors';
import { Modal, modalStyles as m } from '@/components/app/Modal';
import { Button, Chip, ChipGroup, ColorPicker, MoneyInput, TextInput } from '@/components/app/ui';
import { useKashActions } from '@/kash/actions';
import { useKash } from '@/kash/data';

/** "Poupança · Banco X" → { kind, bank } */
export function splitAccountKind(kind: string): { kind: AccountKind; bank: string } {
  const [k, ...rest] = kind.split(' · ');
  const known = ACCOUNT_KINDS.find((x) => x === k) ?? 'Conta corrente';
  return { kind: known, bank: rest.join(' · ') };
}

/** Nova conta / editar conta — tipo, apelido, banco, saldo atual e cor. */
export function AccountModal({ id, onClose }: { id?: string; onClose: () => void }) {
  const snap = useKash();
  const actions = useKashActions();
  const editing = id ? (snap.accounts.find((a) => a.id === id) ?? null) : null;
  const initial = editing ? splitAccountKind(editing.kind) : null;
  const [kind, setKind] = useState<AccountKind>(initial?.kind ?? 'Conta corrente');
  const [name, setName] = useState(editing?.name ?? '');
  const [bank, setBank] = useState(initial?.bank ?? '');
  const [balance, setBalance] = useState(editing?.balance ?? 0);
  const [color, setColor] = useState<string>(editing?.color ?? accountColors[0]);
  const [saving, setSaving] = useState(false);
  const canSave = name.trim().length > 0;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave || saving) return;
    setSaving(true);
    const ok = await actions.saveAccount(editing?.id ?? null, { name, kind, bank, balance, color });
    setSaving(false);
    if (ok) onClose();
  };

  const onDelete = async () => {
    if (!editing) return;
    const txCount = snap.txs.filter((t) => t.sourceId === editing.id).length;
    if (!(await confirmDelete('Excluir conta?', txCount ? `Isso apaga ${txCount} lançamento${txCount > 1 ? 's' : ''} desta conta. Não dá pra desfazer.` : 'Não dá pra desfazer.'))) return;
    if (await actions.deleteAccount(editing.id, editing.name)) onClose();
  };

  return (
    <Modal
      title={editing ? 'Editar conta' : 'Nova conta'}
      onClose={onClose}
      testID="modal-account"
      footer={
        <>
          <Button type="submit" form="account-form" disabled={!canSave} loading={saving} testID="add-account-save">
            {editing ? 'Salvar alterações' : 'Adicionar conta'}
          </Button>
          {editing ? (
            <Button variant="dangerSoft" size="md" onClick={() => void onDelete()} testID="add-account-delete">
              Excluir conta
            </Button>
          ) : null}
        </>
      }
    >
      <form id="account-form" className={m.body} onSubmit={(e) => void onSubmit(e)} noValidate>
        <ChipGroup label="Tipo de conta">
          {ACCOUNT_KINDS.map((k) => (
            <Chip key={k} label={k} selected={kind === k} onSelect={() => setKind(k)} testID={`add-account-kind-${k}`} />
          ))}
        </ChipGroup>
        <TextInput label="Apelido" placeholder="ex.: Conta do estágio" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} testID="add-account-name" />
        <TextInput label="Banco ou instituição" placeholder="ex.: Nubank" value={bank} onChange={(e) => setBank(e.target.value)} maxLength={40} testID="add-account-bank" />
        <MoneyInput label="Saldo atual" value={balance} onChangeValue={setBalance} allowNegative hint={editing ? 'Ajustar o saldo não cria lançamento.' : undefined} testID="add-account-balance" />
        <ColorPicker label="Cor" value={color} onChange={setColor} testID="add-account-color" />
      </form>
    </Modal>
  );
}
