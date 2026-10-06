import { BRAND_GREEN, CATEGORY_COLORS as categoryColors, INVOICE_COLOR } from '../categories';
import type { Account, Card, Tx } from '../types';
import { monthName, parseISODate, relativeDayLabel } from '../dates';
import { round2 } from '../money';

export interface TxView {
  id: string;
  title: string;
  initial: string;
  color: string;
  /** "Hoje · Comida · Conta corrente" */
  meta: string;
  amount: number;
  isExpense: boolean;
}

/** Projeção de um lançamento para a linha de lista. */
export function txView(tx: Tx, accounts: Account[], cards: Card[], now: Date): TxView {
  const isExpense = tx.amount < 0;
  const color = tx.category === 'Fatura' ? INVOICE_COLOR : isExpense && tx.category !== 'Entrada' ? categoryColors[tx.category] : BRAND_GREEN;
  const sourceName = cards.find((c) => c.id === tx.sourceId)?.name ?? accounts.find((a) => a.id === tx.sourceId)?.name ?? '';
  return {
    id: tx.id,
    title: tx.title,
    initial: (tx.title[0] ?? '?').toUpperCase(),
    color,
    meta: `${relativeDayLabel(tx.date, now)} · ${isExpense ? (tx.category === 'Fatura' ? 'Fatura' : tx.category) : 'Entrada'} · ${sourceName}`,
    amount: tx.amount,
    isExpense,
  };
}

/** Rótulo de origem no sheet de gasto: "Cartão principal •••• 4821" / "Conta corrente". */
export interface SourceOption {
  id: string;
  label: string;
  isCard: boolean;
}

export function sourceOptions(cards: Card[], accounts: Account[]): SourceOption[] {
  return [
    ...cards.map((c) => ({ id: c.id, label: `${c.name} •••• ${c.last4}`, isCard: true })),
    ...accounts.map((a) => ({ id: a.id, label: a.name, isCard: false })),
  ];
}

export type TxKindFilter = 'all' | 'expense' | 'income';

export interface TxFilters {
  /** 0 = mês atual, -1 = mês anterior… */
  monthOffset: number;
  kind: TxKindFilter;
  /** categoria (saídas) ou null para todas */
  category: string | null;
}

export const DEFAULT_TX_FILTERS: TxFilters = { monthOffset: 0, kind: 'all', category: null };

/** Mês de referência (1º dia) para um deslocamento. */
export function monthRef(offset: number, now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth() + offset, 1);
}

/** "outubro 2026" */
export function monthTitle(offset: number, now: Date): string {
  const ref = monthRef(offset, now);
  return `${monthName(0, ref)} ${ref.getFullYear()}`;
}

/** Lançamentos de um mês (por deslocamento), do mais recente para o mais antigo. */
export function txsOfMonth(txs: Tx[], offset: number, now: Date): Tx[] {
  const ref = monthRef(offset, now);
  return txs
    .filter((t) => {
      const d = parseISODate(t.date);
      return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
    })
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function filterTxs(txs: Tx[], filters: TxFilters, now: Date): Tx[] {
  return txsOfMonth(txs, filters.monthOffset, now).filter((t) => {
    if (filters.kind === 'expense' && t.amount >= 0) return false;
    if (filters.kind === 'income' && t.amount < 0) return false;
    if (filters.category && t.category !== filters.category) return false;
    return true;
  });
}

export interface TxDayGroup {
  /** ISO date */
  date: string;
  label: string;
  items: TxView[];
}

/** Agrupa por dia preservando a ordem (mais recente primeiro). */
export function groupTxsByDay(txs: Tx[], accounts: Account[], cards: Card[], now: Date): TxDayGroup[] {
  const groups: TxDayGroup[] = [];
  for (const t of txs) {
    const last = groups[groups.length - 1];
    const view = txView(t, accounts, cards, now);
    if (last && last.date === t.date) last.items.push(view);
    else groups.push({ date: t.date, label: relativeDayLabel(t.date, now), items: [view] });
  }
  return groups;
}

export interface TxTotals {
  count: number;
  spent: number;
  income: number;
}

export function txTotals(txs: Tx[]): TxTotals {
  return {
    count: txs.length,
    spent: round2(txs.filter((t) => t.amount < 0).reduce((a, t) => a + Math.abs(t.amount), 0)),
    income: round2(txs.filter((t) => t.amount > 0).reduce((a, t) => a + t.amount, 0)),
  };
}
