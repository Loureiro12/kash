'use client';

import { goalProgress } from '@kash/domain';
import { useMemo, useState } from 'react';
import { confirmDelete } from '@/components/app/Confirm';
import { accountColors } from '@/components/app/colors';
import { Modal, modalStyles as m } from '@/components/app/Modal';
import { Button, Chip, ChipGroup, ColorPicker, DayInput, MoneyInput, parseDay, TextInput } from '@/components/app/ui';
import { useKashActions } from '@/kash/actions';
import { useKash } from '@/kash/data';

/** Nova meta / editar — nome, valor, já guardado, aporte mensal (prévia do prazo), dia, conta e cor. */
export function GoalModal({ id, onClose }: { id?: string; onClose: () => void }) {
  const snap = useKash();
  const actions = useKashActions();
  const editing = id ? (snap.goals.find((g) => g.id === id) ?? null) : null;
  const [name, setName] = useState(editing?.name ?? '');
  const [target, setTarget] = useState(editing?.target ?? 0);
  const [saved, setSaved] = useState(editing?.saved ?? 0);
  const [monthly, setMonthly] = useState(editing?.monthly ?? 0);
  const [color, setColor] = useState<string>(editing?.color ?? accountColors[1]);
  const [accountId, setAccountId] = useState<string | null>(editing ? (editing.accountId ?? null) : (snap.accounts[0]?.id ?? null));
  const [depositDay, setDepositDay] = useState(editing?.depositDay ? String(editing.depositDay) : '');
  const [saving, setSaving] = useState(false);
  const dayN = parseDay(depositDay);
  const canSave = name.trim().length > 0 && target > 0 && (depositDay === '' || dayN !== null);

  // prévia do prazo com as mesmas regras da tela de Metas
  const preview = useMemo(() => {
    if (target <= 0) return null;
    const p = goalProgress({ id: 'preview', name, target, saved: Math.min(saved, target), monthly, color });
    if (p.done) return 'Meta batida!';
    if (monthly <= 0) return 'Informe quanto guardar por mês pra ver o prazo';
    return p.eta;
  }, [name, target, saved, monthly, color]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave || saving) return;
    setSaving(true);
    const ok = await actions.saveGoal(editing?.id ?? null, { name, target, saved, monthly, color, accountId, depositDay: dayN });
    setSaving(false);
    if (ok) onClose();
  };

  const onDelete = async () => {
    if (!editing) return;
    if (!(await confirmDelete('Excluir meta?', 'O dinheiro guardado continua na sua conta; só a meta some.'))) return;
    if (await actions.deleteGoal(editing.id, editing.name)) onClose();
  };

  return (
    <Modal
      title={editing ? 'Editar meta' : 'Nova meta'}
      onClose={onClose}
      testID="modal-goal"
      footer={
        <>
          <Button type="submit" form="goal-form" disabled={!canSave} loading={saving} testID="add-goal-save">
            {editing ? 'Salvar alterações' : 'Criar meta'}
          </Button>
          {editing ? (
            <Button variant="dangerSoft" size="md" onClick={() => void onDelete()} testID="add-goal-delete">
              Excluir meta
            </Button>
          ) : null}
        </>
      }
    >
      <form id="goal-form" className={m.body} onSubmit={(e) => void onSubmit(e)} noValidate>
        <TextInput label="Nome da meta" placeholder="ex.: Viagem pra praia" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} testID="add-goal-name" />
        <MoneyInput label="Valor da meta" value={target} onChangeValue={setTarget} testID="add-goal-target" />
        <div className={m.grid2}>
          <MoneyInput label="Já guardado" value={saved} onChangeValue={setSaved} testID="add-goal-saved" />
          <MoneyInput label="Guardar por mês" value={monthly} onChangeValue={setMonthly} testID="add-goal-monthly" />
        </div>
        {preview ? (
          <p className={`${m.note} ${preview === 'Meta batida!' ? m.notePos : ''}`} data-testid="add-goal-eta" aria-live="polite">
            {preview}
          </p>
        ) : null}
        <DayInput label="Dia do depósito (opcional)" placeholder="ex.: 10" value={depositDay} onChange={setDepositDay} error={depositDay && dayN === null ? 'Entre 1 e 31' : null} testID="add-goal-day" />
        {snap.accounts.length > 0 ? (
          <ChipGroup label="Onde o dinheiro fica guardado">
            {snap.accounts.map((a) => (
              <Chip key={a.id} label={a.name} soft selected={accountId === a.id} onSelect={() => setAccountId(a.id)} testID={`add-goal-account-${a.id}`} />
            ))}
          </ChipGroup>
        ) : null}
        <ColorPicker label="Cor" value={color} onChange={setColor} allowCustom={false} testID="add-goal-color" />
      </form>
    </Modal>
  );
}
