import { BRAND_GREEN, CATEGORY_COLORS, INVOICE_COLOR, TRANSFER_COLOR, UNKNOWN_CATEGORY_COLOR } from '../categories';
import { isTransfer, type Account, type Card, type Tx } from '../types';
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
  /** como a linha se apresenta: transferência sem sinal e em cor neutra */
  kind: 'expense' | 'income' | 'transfer';
  /** transferência: id para abrir a edição das duas pernas */
  transferId?: string;
}

/** Projeção de um lançamento para a linha de lista. */
export function txView(tx: Tx, accounts: Account[], cards: Card[], now: Date, colors: Readonly<Record<string, string>> = CATEGORY_COLORS, transferPeer?: Tx): TxView {
  if (isTransfer(tx)) return transferView(tx, accounts, now, transferPeer);
  const isExpense = tx.amount < 0;
  const color = tx.category === 'Fatura' ? INVOICE_COLOR : isExpense && tx.category !== 'Entrada' ? (colors[tx.category] ?? UNKNOWN_CATEGORY_COLOR) : BRAND_GREEN;
  const sourceName = cards.find((c) => c.id === tx.sourceId)?.name ?? accounts.find((a) => a.id === tx.sourceId)?.name ?? '';
  return {
    id: tx.id,
    title: tx.title,
    initial: (tx.title[0] ?? '?').toUpperCase(),
    color,
    meta: `${relativeDayLabel(tx.date, now)} · ${isExpense ? (tx.category === 'Fatura' ? 'Fatura' : tx.category) : 'Entrada'} · ${sourceName}`,
    amount: tx.amount,
    isExpense,
    kind: isExpense ? 'expense' : 'income',
  };
}

const accountName = (accounts: Account[], id: string | undefined) => accounts.find((a) => a.id === id)?.name ?? 'conta';

/** Transferência numa linha só: "Hoje · Transferência · Corrente → Poupança", valor sem sinal. */
function transferView(tx: Tx, accounts: Account[], now: Date, peer?: Tx): TxView {
  const out = tx.amount < 0 ? tx : peer;
  const into = tx.amount < 0 ? peer : tx;
  const route = `${accountName(accounts, out?.sourceId)} → ${accountName(accounts, into?.sourceId)}`;
  return {
    id: tx.id,
    title: tx.title,
    initial: '⇄',
    color: TRANSFER_COLOR,
    meta: `${relativeDayLabel(tx.date, now)} · Transferência · ${route}`,
    amount: Math.abs(tx.amount),
    isExpense: false,
    kind: 'transfer',
    transferId: tx.transferId,
  };
}

/**
 * Lista para exibição: cada transferência aparece uma vez (a perna de saída; a de entrada só se
 * a saída não estiver na lista) e leva a outra perna junto para montar "origem → destino".
 */
export function collapseTransfers(txs: Tx[]): Array<{ tx: Tx; peer?: Tx }> {
  const legs = new Map<string, Tx[]>();
  for (const t of txs) if (t.transferId) legs.set(t.transferId, [...(legs.get(t.transferId) ?? []), t]);
  const out: Array<{ tx: Tx; peer?: Tx }> = [];
  for (const t of txs) {
    if (!t.transferId) {
      out.push({ tx: t });
      continue;
    }
    const pair = legs.get(t.transferId) ?? [t];
    const shown = pair.find((l) => l.amount < 0) ?? pair[0]!;
    if (shown.id !== t.id) continue;
    out.push({ tx: t, peer: pair.find((l) => l.id !== t.id) });
  }
  return out;
}

/** Linhas de uma lista de lançamentos (transferências colapsadas). */
export function txViews(txs: Tx[], accounts: Account[], cards: Card[], now: Date, colors: Readonly<Record<string, string>> = CATEGORY_COLORS): TxView[] {
  return collapseTransfers(txs).map(({ tx, peer }) => txView(tx, accounts, cards, now, colors, peer));
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

export type TxKindFilter = 'all' | 'expense' | 'income' | 'transfer';

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
    if (filters.kind === 'transfer') return isTransfer(t);
    if (filters.kind === 'expense' && (t.amount >= 0 || isTransfer(t))) return false;
    if (filters.kind === 'income' && (t.amount < 0 || isTransfer(t))) return false;
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
export function groupTxsByDay(txs: Tx[], accounts: Account[], cards: Card[], now: Date, colors: Readonly<Record<string, string>> = CATEGORY_COLORS): TxDayGroup[] {
  const groups: TxDayGroup[] = [];
  for (const { tx: t, peer } of collapseTransfers(txs)) {
    const last = groups[groups.length - 1];
    const view = txView(t, accounts, cards, now, colors, peer);
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

/** Totais da lista: transferência conta como uma linha e fica fora de gasto e entrada. */
export function txTotals(txs: Tx[]): TxTotals {
  const moves = txs.filter((t) => !isTransfer(t));
  return {
    count: collapseTransfers(txs).length,
    spent: round2(moves.filter((t) => t.amount < 0).reduce((a, t) => a + Math.abs(t.amount), 0)),
    income: round2(moves.filter((t) => t.amount > 0).reduce((a, t) => a + t.amount, 0)),
  };
}
