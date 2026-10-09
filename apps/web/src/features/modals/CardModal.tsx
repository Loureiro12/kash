'use client';

import { formatBRL, type CardGradientId } from '@kash/domain';
import { useState } from 'react';
import { confirmDelete } from '@/components/app/Confirm';
import { cardGradients, presetBackground } from '@/components/app/colors';
import { Modal, modalStyles as m } from '@/components/app/Modal';
import { Button, CreditCardFace, CustomSwatch, DayInput, MoneyInput, parseDay, TextInput, uiStyles } from '@/components/app/ui';
import { useKashActions } from '@/kash/actions';
import { useKash } from '@/kash/data';

const onlyDigits = (v: string, max: number) => v.replace(/\D/g, '').slice(0, max);

/** Novo cartão / editar cartão — preview ao vivo, 4 gradientes + cor personalizada. */
export function CardModal({ id, onClose }: { id?: string; onClose: () => void }) {
  const snap = useKash();
  const actions = useKashActions();
  const editing = id ? (snap.cards.find((c) => c.id === id) ?? null) : null;
  const [name, setName] = useState(editing?.name ?? '');
  const [last4, setLast4] = useState(editing?.last4 ?? '');
  const [limit, setLimit] = useState(editing?.limit ?? 0);
  const [closing, setClosing] = useState(editing ? String(editing.closingDay) : '');
  const [due, setDue] = useState(editing ? String(editing.dueDay) : '');
  const [gradientId, setGradientId] = useState<CardGradientId>(editing?.gradientId ?? 'green');
  const [customColor, setCustomColor] = useState<string | null>(editing?.color ?? null);
  const [useCustom, setUseCustom] = useState(!!editing?.color);
  const [saving, setSaving] = useState(false);
  const closingDay = parseDay(closing);
  const dueDay = parseDay(due);
  const daysOk = (closing === '' || closingDay !== null) && (due === '' || dueDay !== null);
  const canSave = name.trim().length > 0 && last4.length === 4 && limit > 0 && daysOk;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave || saving) return;
    setSaving(true);
    const ok = await actions.saveCard(editing?.id ?? null, { name, last4, limit, closingDay, dueDay, gradientId, color: useCustom ? customColor : null });
    setSaving(false);
    if (ok) onClose();
  };

  const onDelete = async () => {
    if (!editing) return;
    const txCount = snap.txs.filter((t) => t.sourceId === editing.id).length;
    const planCount = snap.plans.filter((p) => p.cardId === editing.id && p.current < p.installments).length;
    const parts = [txCount ? `${txCount} lançamento${txCount > 1 ? 's' : ''}` : '', planCount ? `${planCount} parcelamento${planCount > 1 ? 's' : ''}` : ''].filter(Boolean);
    if (!(await confirmDelete('Excluir cartão?', parts.length ? `Isso apaga ${parts.join(' e ')} deste cartão. Não dá pra desfazer.` : 'Não dá pra desfazer.'))) return;
    if (await actions.deleteCard(editing.id, editing.name)) onClose();
  };

  return (
    <Modal
      title={editing ? 'Editar cartão' : 'Novo cartão'}
      onClose={onClose}
      testID="modal-card"
      footer={
        <>
          <Button type="submit" form="card-form" disabled={!canSave} loading={saving} testID="add-card-save">
            {editing ? 'Salvar alterações' : 'Adicionar cartão'}
          </Button>
          {editing ? (
            <Button variant="dangerSoft" size="md" onClick={() => void onDelete()} testID="add-card-delete">
              Excluir cartão
            </Button>
          ) : null}
        </>
      }
    >
      <form id="card-form" className={m.body} onSubmit={(e) => void onSubmit(e)} noValidate>
        <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
          <CreditCardFace
            name={name.trim() || 'Nome do cartão'}
            gradientId={gradientId}
            color={useCustom ? customColor : null}
            caption="Limite"
            amount={limit > 0 ? formatBRL(limit) : 'R$ —'}
            last4={last4.padEnd(4, '•')}
            style={{ maxWidth: 260 }}
          />
          <div className={uiStyles.field}>
            <span className={uiStyles.label} id="card-color-label">
              Cor
            </span>
            <div className={uiStyles.swatches} role="radiogroup" aria-labelledby="card-color-label">
              {cardGradients.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  role="radio"
                  aria-checked={!useCustom && gradientId === g.id}
                  aria-label={`Cor ${g.id}`}
                  className={uiStyles.swatch}
                  onClick={() => {
                    setGradientId(g.id);
                    setUseCustom(false);
                  }}
                  data-testid={`add-card-color-${g.id}`}
                >
                  <span style={{ background: presetBackground(g) }} />
                </button>
              ))}
              <CustomSwatch
                value={customColor}
                selected={useCustom}
                onChange={(hex) => {
                  setCustomColor(hex);
                  setUseCustom(true);
                }}
                testID="add-card-color-custom"
              />
            </div>
          </div>
        </div>
        <TextInput label="Nome do cartão" placeholder="ex.: Cartão da faculdade" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} testID="add-card-name" />
        <div className={m.grid2}>
          <TextInput label="Últimos 4 dígitos" placeholder="0000" inputMode="numeric" autoComplete="off" value={last4} onChange={(e) => setLast4(onlyDigits(e.target.value, 4))} testID="add-card-last4" />
          <MoneyInput label="Limite" value={limit} onChangeValue={setLimit} testID="add-card-limit" />
        </div>
        <div className={m.grid2}>
          <DayInput label="Dia do fechamento" placeholder="ex.: 28" value={closing} onChange={setClosing} error={closing && closingDay === null ? 'Entre 1 e 31' : null} testID="add-card-closing" />
          <DayInput label="Dia do vencimento" placeholder="ex.: 5" value={due} onChange={setDue} error={due && dueDay === null ? 'Entre 1 e 31' : null} testID="add-card-due" />
        </div>
      </form>
    </Modal>
  );
}
