import { toISODate } from '../dates';
import { formatMoney, round2 } from '../money';
import { isTransfer, type Settings, type Tx } from '../types';
import { budgetSplit } from './budget';

/**
 * O que os widgets (iOS e Android) mostram: gasto de hoje e quanto sobra no limite do mês.
 * Vai pronto em texto (o widget só exibe) e respeita "ocultar valores".
 */
export interface WidgetSummary {
  /** dia dos números (yyyy-mm-dd): o widget sabe quando ficaram velhos */
  day: string;
  today: string;
  /** "R$ 1.230,00" (sobra) ou "R$ 70,00" (passou), conforme `over` */
  left: string;
  /** "Sobram no mês" | "Passou do limite" | "Gasto no mês" (sem limite) */
  leftLabel: string;
  /** 0–100: quanto do limite já foi (0 sem limite) */
  pct: number;
  over: boolean;
  hidden: boolean;
  /** 0/1 para o Android/iOS lerem sem JSON aninhado */
  signedIn: 1;
}

const isSpend = (t: Tx) => t.amount < 0 && t.category !== 'Entrada' && t.category !== 'Fatura' && !isTransfer(t);

export function widgetSummary(input: { txs: readonly Tx[]; cardIds: readonly string[]; settings: Pick<Settings, 'monthlyBudget' | 'cardBudget' | 'hideValues'> }, now: Date): WidgetSummary {
  const day = toISODate(now);
  const todaySpent = round2(input.txs.filter((t) => isSpend(t) && t.date === day).reduce((a, t) => a + Math.abs(t.amount), 0));
  const total = budgetSplit(input.txs, input.cardIds, input.settings, now).total;
  const hidden = input.settings.hideValues;
  const money = (v: number) => formatMoney(v, hidden);
  if (total.budget <= 0) {
    return { day, today: money(todaySpent), left: money(total.spent), leftLabel: 'Gasto no mês', pct: 0, over: false, hidden, signedIn: 1 };
  }
  const left = round2(total.budget - total.spent);
  return {
    day,
    today: money(todaySpent),
    left: money(Math.abs(left)),
    leftLabel: left >= 0 ? 'Sobram no mês' : 'Passou do limite',
    pct: Math.min(100, Math.round((total.spent / total.budget) * 100)),
    over: left < 0,
    hidden,
    signedIn: 1,
  };
}
