'use client';

import { categoryColorMap, formatBRL, installmentSchedule, monthKey, monthKeyName, monthKeyToDate, round2, toISODate, type TxKind } from '@kash/domain';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { confirmDialog } from '@/components/app/Confirm';
import { Modal, modalStyles as m } from '@/components/app/Modal';
import { Button, Chip, ChipGroup, Field, Segmented, Stepper, TextInput, uiStyles } from '@/components/app/ui';
import { useKashActions } from '@/kash/actions';
import { useKash } from '@/kash/data';
import { amountFromDigits, digitsFrom } from '@/kash/money';
import { sourcesView } from '@/kash/views';
import { routes } from '@/features/app/nav';

export const MAX_INSTALLMENTS = 24;

const shortMonth = (key: string, current: string) => (key === current ? 'Este mês' : `${monthKeyName(key).slice(0, 3)}/${key.slice(2, 4)}`);

function shiftMonthKey(key: string, delta: number): string {
  const d = monthKeyToDate(key);
  d.setMonth(d.getMonth() + delta);
  return monthKey(d);
}

/** Lançar gasto / registrar entrada / editar lançamento. */
export function TransactionModal({ txId, initialKind = 'expense', onClose }: { txId?: string; initialKind?: TxKind; onClose: () => void }) {
  const snap = useKash();
  const actions = useKashActions();
  const [now] = useState(() => new Date());
  const today = toISODate(now);
  const thisMonth = monthKey(now);
  const editing = txId ? (snap.txs.find((t) => t.id === txId) ?? null) : null;
  const plan = editing?.planId ? (snap.plans.find((p) => p.id === editing.planId) ?? null) : null;
  const sources = useMemo(() => sourcesView(snap), [snap]);
  const accountSources = sources.filter((s) => !s.isCard);
  const names = snap.categories.map((c) => c.name);
  const colors = useMemo(() => categoryColorMap(snap.categories), [snap.categories]);
  const defaultCategory = names.includes('Comida') ? 'Comida' : (names[0] ?? 'Outros');

  const [kind, setKind] = useState<TxKind>(editing ? (editing.amount < 0 ? 'expense' : 'income') : initialKind);
  const [digits, setDigits] = useState(editing ? String(Math.round(Math.abs(editing.amount) * 100)) : '');
  const [category, setCategory] = useState(editing && editing.category !== 'Entrada' && editing.category !== 'Fatura' ? editing.category : defaultCategory);
  const [sourceId, setSourceId] = useState(editing?.sourceId ?? (initialKind === 'income' ? accountSources[0]?.id : sources[0]?.id) ?? '');
  const [note, setNote] = useState(editing?.title ?? '');
  const [date, setDate] = useState(editing?.date ?? today);
  const [installments, setInstallments] = useState(1);
  const [firstMonth, setFirstMonth] = useState(thisMonth);
  const [valueMode, setValueMode] = useState<'total' | 'parcela'>('total');
  const [saving, setSaving] = useState(false);

  const isIncome = kind === 'income';
  const isInvoicePayment = editing?.category === 'Fatura';
  const typed = amountFromDigits(digits);
  const srcIsCard = sources.find((s) => s.id === sourceId)?.isCard ?? false;
  const effectiveSource = isIncome && srcIsCard ? (accountSources[0]?.id ?? '') : sourceId;
  const n = !editing && !isIncome && srcIsCard ? installments : 1;
  const amount = n > 1 && valueMode === 'parcela' ? round2(typed * n) : typed;
  const preview = useMemo(() => installmentSchedule(amount, n, firstMonth, now), [amount, n, firstMonth, now]);
  const pastStart = n > 1 && preview.paid > 0;
  const oldestMonth = monthKey(new Date(now.getFullYear(), now.getMonth() - (MAX_INSTALLMENTS - 1), 1));
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= today;
  const canSave = amount > 0 && !!effectiveSource && validDate && (!isIncome || accountSources.some((s) => s.id === effectiveSource)) && !(n > 1 && preview.finished);

  const visibleSources = isIncome ? accountSources : editing && plan ? sources.filter((s) => s.isCard) : sources;
  const title = editing ? 'Editar lançamento' : isIncome ? 'Registrar entrada' : 'Lançar gasto';

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canSave || saving) return;
    setSaving(true);
    const values = { kind, amount, category, sourceId: effectiveSource, note, installments: n, date, ...(n > 1 ? { firstInstallmentMonth: firstMonth } : {}) };
    const ok = editing ? await actions.updateTransaction(editing, values) : await actions.addTransaction(values);
    setSaving(false);
    if (ok) onClose();
  };

  const onDelete = async () => {
    if (!editing) return;
    const choice = plan
      ? await confirmDialog({
          title: 'Excluir parcela?',
          message: `“${plan.title}” tem ${plan.installments} parcelas.`,
          choices: [
            { label: 'Só esta parcela', value: 'single', variant: 'surface', testID: 'confirm-single' },
            { label: 'Todas as parcelas', value: 'plan', variant: 'danger', testID: 'confirm-plan' },
          ],
        })
      : await confirmDialog({ title: 'Excluir lançamento?', message: 'Você pode desfazer logo em seguida.', choices: [{ label: 'Excluir', value: 'single', variant: 'danger', testID: 'confirm-yes' }] });
    if (!choice) return;
    onClose();
    await actions.deleteTransaction(editing, choice === 'plan' ? 'plan' : 'single');
  };

  if (sources.length === 0) {
    return (
      <Modal title={title} onClose={onClose} testID="modal-transaction">
        <p className={m.note} data-testid="tx-no-sources">
          Pra lançar, cadastre antes onde o dinheiro está: uma conta bancária ou um cartão.
        </p>
        <div className={m.actionsRow}>
          <Link href={routes.accounts} className={`${uiStyles.btn} ${uiStyles.surface} ${uiStyles.md}`} onClick={onClose}>
            Contas
          </Link>
          <Link href={routes.cards} className={`${uiStyles.btn} ${uiStyles.surface} ${uiStyles.md}`} onClick={onClose}>
            Cartões
          </Link>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title={title}
      onClose={onClose}
      testID="modal-transaction"
      headerExtra={
        !editing ? (
          <Segmented<TxKind>
            label="Tipo de lançamento"
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
          />
        ) : undefined
      }
      footer={
        <>
          <Button type="submit" form="tx-form" disabled={!canSave} loading={saving} testID="expense-save">
            {editing ? 'Salvar alterações' : isIncome ? 'Salvar entrada' : 'Salvar gasto'}
          </Button>
          {editing ? (
            <Button variant="dangerSoft" size="md" onClick={() => void onDelete()} testID="expense-delete">
              Excluir lançamento
            </Button>
          ) : null}
        </>
      }
    >
      <form id="tx-form" onSubmit={(e) => void onSubmit(e)} className={m.body} noValidate>
        <Field label={n > 1 && valueMode === 'parcela' ? 'Valor da parcela' : 'Valor'} htmlFor="tx-amount">
          <input
            id="tx-amount"
            className={`${m.amount} ${isIncome && typed > 0 ? m.amountIncome : ''}`}
            inputMode="numeric"
            autoComplete="off"
            placeholder="R$ 0,00"
            value={typed > 0 ? `${isIncome ? '+ ' : ''}${formatBRL(typed)}` : ''}
            onChange={(e) => setDigits(digitsFrom(e.target.value))}
            aria-describedby="tx-amount-hint"
            data-testid="expense-amount"
            data-autofocus
          />
          <span id="tx-amount-hint" className="sr-only">
            Digite só os números; os dois últimos são os centavos.
          </span>
        </Field>

        {!isIncome && !isInvoicePayment ? (
          <ChipGroup label="Categoria" testID="tx-categories">
            {names.map((c) => (
              <Chip key={c} label={c} dotColor={colors[c]} selected={category === c} onSelect={() => setCategory(c)} testID={`chip-cat-${c}`} />
            ))}
          </ChipGroup>
        ) : null}

        <ChipGroup label={isIncome ? 'Entrou em' : 'Pago com'} testID="tx-sources">
          {visibleSources.map((s) => (
            <Chip key={s.id} label={s.label} soft selected={effectiveSource === s.id} onSelect={() => setSourceId(s.id)} testID={`chip-src-${s.id}`} />
          ))}
        </ChipGroup>
        {isIncome && accountSources.length === 0 ? (
          <p className={`${m.note} ${m.noteNeg}`}>Entradas vão para uma conta. Cadastre uma conta bancária primeiro.</p>
        ) : null}

        {!editing && !isIncome && srcIsCard ? (
          <div className={m.panelRow} data-testid="expense-installments">
            <div className={m.panelRowText}>
              <span className={m.panelRowTitle} data-testid="expense-installments-label">
                {n === 1 ? 'À vista' : `${n}x de ${formatBRL(preview.per)}`}
              </span>
              <span className={m.panelRowSub}>{n === 1 ? 'Use + para parcelar' : `até ${preview.lastMonth} · total ${formatBRL(amount)}`}</span>
            </div>
            <Stepper value={installments} onChange={setInstallments} min={1} max={MAX_INSTALLMENTS} decLabel="Menos parcelas" incLabel="Mais parcelas" testID="expense-inst" />
          </div>
        ) : null}

        {!editing && !isIncome && srcIsCard && n > 1 ? (
          <div className={uiStyles.field} data-testid="expense-plan-start">
            <div className={m.grid2}>
              <Field label="1ª parcela em">
                <div className={m.panelRow} style={{ minHeight: 48, padding: '4px 4px 4px 14px' }}>
                  <span className={m.panelRowTitle} style={{ flex: 1 }} data-testid="expense-first-month" aria-live="polite">
                    {shortMonth(firstMonth, thisMonth)}
                  </span>
                  <button type="button" className={uiStyles.stepBtn} onClick={() => setFirstMonth((k) => (shiftMonthKey(k, -1) < oldestMonth ? oldestMonth : shiftMonthKey(k, -1)))} disabled={firstMonth <= oldestMonth} aria-label="Mês anterior" data-testid="expense-first-month-prev">
                    ‹
                  </button>
                  <button type="button" className={uiStyles.stepBtn} onClick={() => setFirstMonth((k) => (shiftMonthKey(k, 1) > thisMonth ? thisMonth : shiftMonthKey(k, 1)))} disabled={firstMonth >= thisMonth} aria-label="Próximo mês" data-testid="expense-first-month-next">
                    ›
                  </button>
                </div>
              </Field>
              <Field label="Valor digitado">
                <Segmented
                  label="Valor digitado"
                  value={valueMode}
                  onChange={setValueMode}
                  options={[
                    { value: 'total', label: 'Total', testID: 'expense-value-mode-total' },
                    { value: 'parcela', label: 'Parcela', testID: 'expense-value-mode-parcela' },
                  ]}
                />
              </Field>
            </div>
            {preview.finished ? (
              <p className={`${m.note} ${m.noteNeg}`} data-testid="expense-plan-summary">
                Essa compra já foi toda paga: a última parcela caiu em {shortMonth(shiftMonthKey(firstMonth, n - 1), thisMonth)}.
              </p>
            ) : pastStart ? (
              <p className={m.note} data-testid="expense-plan-summary">
                {preview.paid === 1 ? '1 parcela já paga' : `${preview.paid} parcelas já pagas`} ({shortMonth(firstMonth, thisMonth)}
                {preview.paid > 1 ? ` a ${shortMonth(shiftMonthKey(thisMonth, -1), thisMonth)}` : ''}) fica{preview.paid > 1 ? 'm' : ''} fora. Lança a {preview.current}/{n} agora; {preview.remaining === 1 ? 'é a última' : `faltam ${preview.remaining} até ${preview.lastMonth}`}: {formatBRL(preview.remainingAmount)}.
              </p>
            ) : null}
          </div>
        ) : null}

        <div className={m.grid2}>
          <TextInput label="Descrição" placeholder={isIncome ? 'ex.: freela' : 'ex.: lanche com a galera'} value={note} onChange={(e) => setNote(e.target.value)} maxLength={80} testID="expense-note" />
          <TextInput label="Data" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} error={validDate ? null : 'Escolha uma data até hoje.'} testID="expense-date" />
        </div>

        {editing && plan ? (
          <p className={m.note} data-testid="expense-plan-note">
            Parcela de “{plan.title}” ({plan.installments}x). Alterar o valor muda só esta parcela; trocar o cartão leva o parcelamento inteiro.
          </p>
        ) : null}
        {isInvoicePayment ? <p className={m.note}>Pagamento de fatura: não entra como gasto no relatório.</p> : null}
      </form>
    </Modal>
  );
}
