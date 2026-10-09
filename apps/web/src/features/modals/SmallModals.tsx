'use client';

import { formatBRL, invoiceView } from '@kash/domain';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icon } from '@/components/app/Icon';
import { Modal, modalStyles as m } from '@/components/app/Modal';
import { Button, Chip, ChipGroup, MoneyInput, PasswordInput } from '@/components/app/ui';
import { useKashActions } from '@/kash/actions';
import { useKash } from '@/kash/data';
import { routes } from '@/features/app/nav';

/* ---------- Registrar depósito numa meta ---------- */

export function DepositModal({ goalId, onClose }: { goalId: string; onClose: () => void }) {
  const snap = useKash();
  const actions = useKashActions();
  const goal = snap.goals.find((g) => g.id === goalId) ?? null;
  const [amount, setAmount] = useState(goal?.monthly ?? 0);
  const [accountId, setAccountId] = useState<string | null>(goal?.accountId ?? snap.accounts[0]?.id ?? null);
  const [saving, setSaving] = useState(false);
  if (!goal) return null;
  const remaining = Math.max(0, goal.target - goal.saved);
  const canSave = amount > 0;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave || saving) return;
    setSaving(true);
    const ok = await actions.recordDeposit(goal.id, goal.name, amount, accountId);
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Modal
      title="Registrar depósito"
      onClose={onClose}
      testID="modal-deposit"
      footer={
        <Button type="submit" form="deposit-form" disabled={!canSave} loading={saving} testID="deposit-save">
          Confirmar depósito
        </Button>
      }
    >
      <form id="deposit-form" className={m.body} onSubmit={(e) => void onSubmit(e)} noValidate>
        <p className={m.note} data-testid="deposit-goal-name">
          {goal.name} · faltam {formatBRL(remaining)}
        </p>
        <MoneyInput label="Valor do depósito" value={amount} onChangeValue={setAmount} className={m.amount} testID="deposit-amount" />
        {snap.accounts.length > 0 ? (
          <ChipGroup label="Onde o dinheiro está guardado">
            {snap.accounts.map((a) => (
              <Chip key={a.id} label={a.name} soft selected={accountId === a.id} onSelect={() => setAccountId(a.id)} testID={`deposit-account-${a.id}`} />
            ))}
          </ChipGroup>
        ) : null}
        <p className={m.note}>O depósito soma na meta. O saldo da conta não muda: o dinheiro continua nela, só fica separado pra meta.</p>
      </form>
    </Modal>
  );
}

/* ---------- Pagar fatura ---------- */

export function PayInvoiceModal({ invoiceId, onClose }: { invoiceId: string; onClose: () => void }) {
  const snap = useKash();
  const actions = useKashActions();
  const invoice = snap.invoices.find((i) => i.id === invoiceId) ?? null;
  const [accountId, setAccountId] = useState(snap.accounts[0]?.id ?? '');
  const [saving, setSaving] = useState(false);
  if (!invoice) return null;
  const view = invoiceView(invoice, snap.cards);
  const account = snap.accounts.find((a) => a.id === accountId);
  const insufficient = !!account && account.balance < view.total;
  const canPay = !!account && !invoice.paid;

  const onPay = async () => {
    if (!canPay || saving) return;
    setSaving(true);
    const ok = await actions.payInvoice(view.id, accountId, `Fatura de ${view.monthName} paga: ${formatBRL(view.total)}`);
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Modal
      title="Pagar fatura"
      onClose={onClose}
      testID="modal-pay-invoice"
      footer={
        <Button onClick={() => void onPay()} disabled={!canPay} loading={saving} testID="pay-invoice-save">
          Pagar {formatBRL(view.total)}
        </Button>
      }
    >
      <div style={{ textAlign: 'center' }}>
        <p className={m.note} data-testid="pay-invoice-title">
          {view.cardName} · fatura de {view.monthName} · vence {view.dueLabel}
        </p>
        <p className={m.bigValue} data-testid="pay-invoice-amount">
          {formatBRL(view.total)}
        </p>
      </div>
      {snap.accounts.length === 0 ? (
        <p className={`${m.note} ${m.noteNeg}`}>Cadastre uma conta bancária pra registrar o pagamento.</p>
      ) : (
        <ChipGroup label="Pagar com">
          {snap.accounts.map((a) => (
            <Chip key={a.id} label={`${a.name} · ${formatBRL(a.balance)}`} soft selected={accountId === a.id} onSelect={() => setAccountId(a.id)} testID={`pay-invoice-account-${a.id}`} />
          ))}
        </ChipGroup>
      )}
      {insufficient ? (
        <p className={`${m.note} ${m.noteNeg}`} data-testid="pay-invoice-warning">
          Essa conta fica negativa depois do pagamento. Dá pra pagar mesmo assim.
        </p>
      ) : (
        <p className={m.note}>O pagamento sai do saldo da conta e não entra como gasto no relatório (os gastos já foram contados quando lançados no cartão).</p>
      )}
    </Modal>
  );
}

/* ---------- Alterar senha ---------- */

export const MIN_PASSWORD_LENGTH = 8;

export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const actions = useKashActions();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const tooShort = next.length > 0 && next.length < MIN_PASSWORD_LENGTH;
  const mismatch = confirm.length > 0 && confirm !== next;
  const canSave = current.length > 0 && next.length >= MIN_PASSWORD_LENGTH && confirm === next;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave || saving) return;
    setSaving(true);
    setServerError(null);
    const error = await actions.changePassword(current, next);
    setSaving(false);
    if (error) setServerError(error);
    else onClose();
  };

  return (
    <Modal
      title="Alterar senha"
      onClose={onClose}
      testID="modal-change-password"
      footer={
        <Button type="submit" form="cp-form" disabled={!canSave} loading={saving} testID="cp-save">
          Salvar nova senha
        </Button>
      }
    >
      <form id="cp-form" className={m.body} onSubmit={(e) => void onSubmit(e)} noValidate>
        <PasswordInput
          label="Senha atual"
          autoComplete="current-password"
          value={current}
          onChange={(e) => {
            setCurrent(e.target.value);
            setServerError(null);
          }}
          testID="cp-current"
        />
        <PasswordInput label={`Nova senha (mín. ${MIN_PASSWORD_LENGTH} caracteres)`} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} error={tooShort ? `A nova senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.` : null} testID="cp-new" />
        <PasswordInput label="Confirmar nova senha" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={mismatch ? 'As senhas não conferem.' : null} testID="cp-confirm" />
        {serverError ? (
          <p className={`${m.note} ${m.noteNeg}`} role="alert" data-testid="cp-error">
            {serverError}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}

/* ---------- Excluir conta ---------- */

export function DeleteAccountModal({ onClose }: { onClose: () => void }) {
  const actions = useKashActions();
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const onDelete = async () => {
    if (!confirmed || deleting) return;
    setDeleting(true);
    const ok = await actions.deleteOwnAccount();
    setDeleting(false);
    if (ok) {
      onClose();
      router.replace(routes.login);
    }
  };

  return (
    <Modal
      title="Excluir sua conta?"
      onClose={onClose}
      size="sm"
      testID="modal-delete-account"
      icon={
        <span className={m.dangerIcon} aria-hidden="true">
          <Icon name="trash" size={24} />
        </span>
      }
    >
      <p className={m.note} style={{ fontSize: 14 }}>
        Isso apaga para sempre seus lançamentos, cartões, contas fixas e metas. Não dá pra desfazer.
      </p>
      <label className={m.checkRow}>
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} data-testid="delete-confirm-check" />
        Entendi que vou perder todos os meus dados
      </label>
      <div className={m.actionsRow}>
        <Button variant="secondary" size="md" onClick={onClose} testID="delete-cancel">
          Cancelar
        </Button>
        <Button variant="danger" size="md" disabled={!confirmed} loading={deleting} onClick={() => void onDelete()} testID="delete-confirm">
          Excluir definitivamente
        </Button>
      </div>
    </Modal>
  );
}
