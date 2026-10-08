/**
 * Conversão entre linhas do banco e os tipos do domínio (@kash/domain).
 * O domínio é a linguagem do app; o banco é detalhe de armazenamento.
 */
import type { Account, AccountKind, Bill, Card, Goal, Invoice, Settings, Tx, User } from '@kash/domain';
import type { Database } from './database.types';

type Tables = Database['public']['Tables'];
type Enums = Database['public']['Enums'];
export type AccountRow = Database['public']['Views']['accounts_with_balance']['Row'];
export type CardRow = Tables['cards']['Row'];
export type TxRow = Tables['transactions']['Row'];
export type BillRow = Tables['bills']['Row'];
export type GoalRow = Tables['goals']['Row'];
export type InvoiceRow = Tables['invoices']['Row'];
export type ProfileRow = Tables['profiles']['Row'];

const ACCOUNT_KIND_LABEL: Record<Enums['account_kind'], AccountKind> = {
  corrente: 'Conta corrente',
  poupanca: 'Poupança',
  carteira: 'Carteira',
  investimento: 'Investimento',
};
const ACCOUNT_KIND_ENUM: Record<AccountKind, Enums['account_kind']> = {
  'Conta corrente': 'corrente',
  Poupança: 'poupanca',
  Carteira: 'carteira',
  Investimento: 'investimento',
};

export const num = (v: number | string | null | undefined): number => (v == null ? 0 : typeof v === 'number' ? v : Number(v));

export function toAccount(row: AccountRow): Account {
  const kindLabel = ACCOUNT_KIND_LABEL[row.kind ?? 'corrente'];
  return {
    id: row.id ?? '',
    name: row.name ?? '',
    kind: row.institution ? `${kindLabel} · ${row.institution}` : kindLabel,
    balance: num(row.balance),
    color: row.color ?? '#C6F432',
  };
}

export const accountKindToEnum = (kind: AccountKind): Enums['account_kind'] => ACCOUNT_KIND_ENUM[kind];

export function toCard(row: CardRow): Card {
  return { id: row.id, name: row.name, last4: row.last4, limit: num(row.credit_limit), closingDay: row.closing_day, dueDay: row.due_day, gradientId: row.gradient, ...(row.color ? { color: row.color } : {}) };
}

export function toTx(row: TxRow): Tx {
  return {
    id: row.id,
    title: row.title,
    category: row.category as Tx['category'],
    amount: num(row.amount),
    date: row.date,
    sourceId: row.source_id,
    sourceType: row.source_type,
    planId: row.plan_id ?? undefined,
  };
}

export function toBill(row: BillRow): Bill {
  return {
    id: row.id,
    name: row.name,
    amount: num(row.amount),
    dueDay: row.due_day,
    paid: row.paid_tx_id != null,
    category: row.category as Bill['category'],
    sourceId: row.source_id ?? undefined,
    sourceType: row.source_type ?? undefined,
    paidTxId: row.paid_tx_id ?? undefined,
  };
}

export function toGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    name: row.name,
    target: num(row.target),
    saved: num(row.saved),
    color: row.color,
    monthly: num(row.monthly),
    accountId: row.account_id ?? undefined,
    depositDay: row.deposit_day ?? undefined,
    lastDepositDate: row.last_deposit_date ?? undefined,
  };
}

export function toInvoice(row: InvoiceRow): Invoice {
  return { id: row.id, cardId: row.card_id, month: row.month, total: num(row.total), paid: row.paid_tx_id != null, paidTxId: row.paid_tx_id ?? undefined, paidAt: row.paid_at ?? undefined };
}

export function toUser(row: ProfileRow, email: string): User {
  return { name: row.name, email, phone: row.phone };
}

export function toSettings(row: ProfileRow): Settings {
  return {
    theme: row.theme as Settings['theme'],
    hideValues: row.hide_values,
    billReminder: row.bill_reminder,
    monthlyBudget: num(row.monthly_budget),
    biometrics: row.biometrics,
    currency: 'BRL',
  };
}
