import { CATEGORY_COLORS, UNKNOWN_CATEGORY_COLOR } from '../categories';
import { isTransfer, type Category, type Tx } from '../types';
import { monthKey, monthName, parseISODate } from '../dates';
import { round2 } from '../money';
import { monthSpent, monthTxs } from './balance';

export interface CategorySlice {
  name: Category;
  color: string;
  amount: number;
  /** % do total de saídas do mês */
  pct: number;
}

/** Saídas do mês agrupadas por categoria, ordenadas desc. */
export function categoryBreakdown(txs: Tx[], now: Date, colors: Readonly<Record<string, string>> = CATEGORY_COLORS): CategorySlice[] {
  const byCat = new Map<Category, number>();
  for (const t of monthTxs(txs, now)) {
    if (t.amount >= 0 || t.category === 'Entrada' || t.category === 'Fatura' || isTransfer(t)) continue;
    byCat.set(t.category, (byCat.get(t.category) ?? 0) + Math.abs(t.amount));
  }
  const total = [...byCat.values()].reduce((a, b) => a + b, 0);
  return [...byCat.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, amount]) => ({ name, color: colors[name] ?? UNKNOWN_CATEGORY_COLOR, amount: round2(amount), pct: total > 0 ? Math.round((amount / total) * 100) : 0 }));
}

export interface MonthBar {
  label: string;
  value: number;
  /** altura relativa 6..100 */
  height: number;
  current: boolean;
}

/** Histórico de meses anteriores (mock até existir persistência) — índice 0 = 5 meses atrás. */
export const PREVIOUS_MONTHS_SPENT = [1420, 1680, 1250, 1910, 1530];

/**
 * Gastos reais dos `count` meses anteriores ao atual (índice 0 = o mais antigo), calculados dos
 * lançamentos com as mesmas regras de `monthSpent` (saídas, sem pagamento de fatura).
 */
export function previousMonthsSpent(txs: Tx[], now: Date, count = 5): number[] {
  const keys = Array.from({ length: count }, (_, i) => monthKey(new Date(now.getFullYear(), now.getMonth() - (count - i), 1)));
  const totals = new Map(keys.map((k) => [k, 0]));
  for (const t of txs) {
    if (t.amount >= 0 || t.category === 'Fatura' || isTransfer(t)) continue;
    const key = monthKey(parseISODate(t.date));
    if (totals.has(key)) totals.set(key, totals.get(key)! + Math.abs(t.amount));
  }
  return keys.map((k) => round2(totals.get(k)!));
}

/** Gráfico de 6 barras: 5 meses anteriores + mês atual. */
export function monthlyHistory(txs: Tx[], now: Date, previous: number[] = PREVIOUS_MONTHS_SPENT): MonthBar[] {
  const values = [...previous, monthSpent(txs, now)];
  const max = Math.max(...values, 1);
  return values.map((value, i) => ({
    label: monthName(i - (values.length - 1), now).slice(0, 3),
    value,
    height: Math.max(6, Math.round((value / max) * 100)),
    current: i === values.length - 1,
  }));
}

export interface MonthDelta {
  pct: number;
  message: string;
}

/** "N% a menos/mais que setembro" */
export function monthDelta(txs: Tx[], now: Date, previous: number[] = PREVIOUS_MONTHS_SPENT): MonthDelta {
  const prev = previous[previous.length - 1] ?? 0;
  const current = monthSpent(txs, now);
  const pct = prev > 0 ? Math.round(((current - prev) / prev) * 100) : 0;
  const prevName = monthName(-1, now);
  if (prev <= 0) return { pct: 0, message: `Sem gastos em ${prevName} pra comparar` };
  return { pct, message: pct <= 0 ? `${-pct}% a menos que ${prevName}` : `${pct}% a mais que ${prevName}` };
}

/** Categoria com maior gasto no mês + dica de 10%. */
export function topCategoryTip(txs: Tx[], now: Date): { name: string; amount: number; tip: number } | null {
  const top = categoryBreakdown(txs, now)[0];
  if (!top) return null;
  return { name: top.name.toLowerCase(), amount: top.amount, tip: round2(top.amount * 0.1) };
}
