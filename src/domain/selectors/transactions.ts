import { categoryColors, staticColors } from '@/design-system/tokens/colors';
import type { Account, Card, Tx } from '../types';
import { relativeDayLabel } from '../dates';

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
  const color = isExpense && tx.category !== 'Entrada' ? categoryColors[tx.category] : staticColors.brandGreen;
  const sourceName = cards.find((c) => c.id === tx.sourceId)?.name ?? accounts.find((a) => a.id === tx.sourceId)?.name ?? '';
  return {
    id: tx.id,
    title: tx.title,
    initial: (tx.title[0] ?? '?').toUpperCase(),
    color,
    meta: `${relativeDayLabel(tx.date, now)} · ${isExpense ? tx.category : 'Entrada'} · ${sourceName}`,
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
