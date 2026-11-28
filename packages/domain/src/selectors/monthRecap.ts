import { MONTH_NAMES, toISODate } from '../dates';
import { round2 } from '../money';
import { isTransfer, type Settings, type Tx } from '../types';
import { budgetSplit } from './budget';
import { periodRange, periodReport } from './periodReport';
import type { Reminder } from './reminders';

/**
 * Retrospectiva de um mês fechado ("seu outubro"): o que entrou e saiu, quanto sobrou, onde mais
 * gastou, o maior gasto, dias sem gastar, o limite e a comparação com o mês anterior.
 */
export interface MonthRecap {
  /** yyyy-mm */
  month: string;
  /** "outubro" */
  name: string;
  /** "setembro" */
  previousName: string;
  year: number;
  income: number;
  spent: number;
  /** entrou − saiu (negativo = gastou mais do que entrou) */
  saved: number;
  /** % da entrada que sobrou (null sem entrada) */
  savedPct: number | null;
  /** gastos contra o mês anterior, em % (null sem gasto no anterior) */
  spentVsPrevious: number | null;
  topCategory: { name: string; amount: number; pct: number; color: string } | null;
  /** até 3 categorias, para o gráfico */
  categories: { name: string; amount: number; pct: number; color: string }[];
  biggest: { title: string; amount: number; date: string } | null;
  /** dias do mês sem nenhum gasto */
  noSpendDays: number;
  daysInMonth: number;
  /** quantos gastos no mês */
  txCount: number;
  /** limite do mês: dentro dele? (null sem limite) */
  budget: { limit: number; spent: number; within: boolean; diff: number } | null;
}

const isSpend = (t: Tx) => t.amount < 0 && t.category !== 'Entrada' && t.category !== 'Fatura' && !isTransfer(t);

/** mês fechado mais recente: o anterior ao de `now` */
export function lastClosedMonth(now: Date): string {
  return toISODate(new Date(now.getFullYear(), now.getMonth() - 1, 1)).slice(0, 7);
}

/**
 * Retrospectiva do mês `month` (yyyy-mm). Devolve null se o mês não teve nenhum lançamento
 * (não há o que mostrar).
 */
export function monthRecap(
  txs: readonly Tx[],
  month: string,
  options: { cardIds?: readonly string[]; settings?: Pick<Settings, 'monthlyBudget' | 'cardBudget'>; colors?: Readonly<Record<string, string>> } = {},
): MonthRecap | null {
  const [y, m] = month.split('-').map(Number) as [number, number];
  // o fim do mês (meio-dia do último dia) é o "agora" do relatório: o mês fica inteiro e fechado
  const anchor = new Date(y, m, 0, 12);
  const report = periodReport([...txs], 'month', 0, anchor, { colors: options.colors, topCount: 1 });
  if (report.count === 0) return null;
  const previous = periodReport([...txs], 'month', -1, anchor, {});
  const { start, end } = periodRange('month', 0, anchor);
  const daysInMonth = Math.round((end.getTime() - start.getTime()) / 86_400_000);

  const spendDays = new Set(txs.filter((t) => isSpend(t) && t.date.startsWith(month)).map((t) => t.date));
  const biggestTx = report.txs.filter(isSpend).sort((a, b) => a.amount - b.amount)[0] ?? null;
  const categories = report.categories.slice(0, 3).map((c) => ({ name: c.name, amount: c.amount, pct: c.pct, color: c.color }));

  let budget: MonthRecap['budget'] = null;
  if (options.settings && options.settings.monthlyBudget > 0) {
    const total = budgetSplit(txs, options.cardIds ?? [], options.settings, anchor).total;
    budget = { limit: total.budget, spent: total.spent, within: total.spent <= total.budget, diff: round2(Math.abs(total.budget - total.spent)) };
  }

  const saved = round2(report.income - report.spent);
  return {
    month,
    name: MONTH_NAMES[m - 1]!,
    previousName: MONTH_NAMES[(m + 10) % 12]!,
    year: y,
    income: report.income,
    spent: report.spent,
    saved,
    savedPct: report.income > 0 ? Math.round((saved / report.income) * 100) : null,
    spentVsPrevious: previous.spent > 0 ? Math.round(((report.spent - previous.spent) / previous.spent) * 100) : null,
    topCategory: categories[0] ?? null,
    categories,
    biggest: biggestTx ? { title: biggestTx.title, amount: Math.abs(biggestTx.amount), date: biggestTx.date } : null,
    noSpendDays: daysInMonth - spendDays.size,
    daysInMonth,
    txCount: report.count,
    budget,
  };
}

/** hora da notificação da retrospectiva, no dia 1º */
export const RECAP_HOUR = 10;

/**
 * Notificação "sua retrospectiva chegou" para o dia 1º do próximo mês, às 10h. Sem números (eles
 * mudam até o fim do mês): a tela calcula na hora. Nada se o mês atual não teve lançamentos.
 */
export function monthRecapReminder(txs: readonly Tx[], now: Date): Reminder | null {
  const month = toISODate(now).slice(0, 7);
  if (!txs.some((t) => t.date.startsWith(month))) return null;
  const first = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const name = MONTH_NAMES[now.getMonth()]!;
  return {
    id: `recap:${month}`,
    kind: 'month-recap',
    title: `Sua retrospectiva de ${name} chegou`,
    body: 'Veja quanto entrou, quanto saiu, onde você mais gastou e compare com o mês anterior.',
    at: `${toISODate(first)}T${String(RECAP_HOUR).padStart(2, '0')}:00`,
    route: `/recap?mes=${month}`,
  };
}
