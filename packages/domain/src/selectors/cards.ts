import type { Card, Plan, Tx } from '../types';
import { isSameMonth, monthKey, monthName, nextOccurrenceLabel } from '../dates';
import { round2 } from '../money';

export interface CardUsage {
  used: number;
  available: number;
  /** 0..100 (pode passar de 100 se estourar o limite; a barra limita) */
  pct: number;
}

/** Fatura atual do cartão = Σ |txs| do cartão no mês corrente (meses anteriores já viraram fatura fechada). */
export function cardUsage(card: Card, txs: Tx[], now: Date = new Date()): CardUsage {
  const used = round2(txs.filter((t) => t.sourceId === card.id && t.amount < 0 && isSameMonth(t.date, now)).reduce((a, t) => a + Math.abs(t.amount), 0));
  return { used, available: round2(card.limit - used), pct: card.limit > 0 ? Math.round((used / card.limit) * 100) : 0 };
}

export interface CardDates {
  closes: string;
  due: string;
}

/** "28 out" / "05 nov" — próximo fechamento e vencimento a partir de hoje. */
export function cardDates(card: Card, now: Date): CardDates {
  const closing = nextOccurrenceLabel(card.closingDay, now);
  const due = nextOccurrenceLabel(card.dueDay, now, { day: card.closingDay, monthOffset: closing.monthOffset });
  return { closes: closing.label, due: due.label };
}

export interface PlanView extends Plan {
  /** % de parcelas pagas */
  pct: number;
  /** nome do mês da última parcela */
  endsIn: string;
  remaining: number;
}

/** Parcelas em aberto de um cartão. */
export function activePlans(plans: Plan[], cardId: string, now: Date): PlanView[] {
  return plans
    .filter((p) => p.cardId === cardId && p.current < p.installments)
    .map((p) => ({
      ...p,
      pct: Math.round((p.current / p.installments) * 100),
      endsIn: monthName(p.installments - p.current, now),
      remaining: round2((p.installments - p.current) * p.perInstallment),
    }));
}

export interface InstallmentPreview {
  n: number;
  per: number;
  total: number;
  /** mês da última parcela */
  lastMonth: string;
}

/** Parcelado: per = round(total/n, 2); 1ª parcela hoje; última em n−1 meses. */
export function installmentPreview(amount: number, n: number, now: Date): InstallmentPreview {
  const safeN = Math.max(1, Math.min(24, Math.floor(n)));
  return { n: safeN, per: round2(amount / safeN), total: amount, lastMonth: monthName(safeN - 1, now) };
}

/** Quantos meses de `from` até `to` ("yyyy-mm"); negativo se `to` vem antes. */
export function monthsBetween(from: string, to: string): number {
  const [fy = 0, fm = 1] = from.split('-').map(Number);
  const [ty = 0, tm = 1] = to.split('-').map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

export interface InstallmentSchedule {
  n: number;
  /** valor de cada parcela */
  per: number;
  total: number;
  /** mês ("yyyy-mm") da 1ª parcela */
  firstMonth: string;
  /** parcela que cai no mês atual (1..n); é a única lançada agora */
  current: number;
  /** parcelas de meses anteriores: consideradas pagas e não lançadas */
  paid: number;
  /** parcelas que ainda vão cair, contando a do mês atual */
  remaining: number;
  /** soma das parcelas restantes (inclui a do mês atual) */
  remainingAmount: number;
  /** mês da última parcela, por extenso */
  lastMonth: string;
  /** todas as parcelas já passaram: nada a lançar */
  finished: boolean;
}

/**
 * Cronograma de uma compra parcelada cuja 1ª parcela caiu em `firstMonth` (pode ser no passado).
 * Meses que já passaram contam como pagos e não geram lançamento; lança-se só a parcela do mês
 * atual, e a virada de mês segue com as próximas. `firstMonth` no futuro é tratado como o mês atual.
 */
export function installmentSchedule(total: number, n: number, firstMonth: string, now: Date): InstallmentSchedule {
  const safeN = Math.max(1, Math.min(24, Math.floor(n)));
  const per = round2(total / safeN);
  const elapsed = Math.max(0, monthsBetween(firstMonth, monthKey(now)));
  const current = elapsed + 1;
  const finished = current > safeN;
  const remaining = finished ? 0 : safeN - current + 1;
  return {
    n: safeN,
    per,
    total,
    firstMonth: elapsed === 0 ? monthKey(now) : firstMonth,
    current: Math.min(current, safeN),
    paid: Math.min(elapsed, safeN),
    remaining,
    remainingAmount: round2(per * remaining),
    lastMonth: monthName(safeN - current, now),
    finished,
  };
}
