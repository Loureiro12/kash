import type { Card, Plan, Tx } from '../types';
import { isSameMonth, monthName, nextOccurrenceLabel } from '../dates';
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
