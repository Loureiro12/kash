import type { Account, Bill, Card, Plan } from '../types';
import { monthName } from '../dates';
import { round2 } from '../money';
import { billSourceName, billsTotal } from './bills';

export interface ForecastItem {
  id: string;
  kind: 'installment' | 'bill';
  title: string;
  subtitle: string;
  amount: number;
  /** badge: "6/12" ou "FIXA" */
  tag: string;
}

export interface ForecastMonth {
  /** 1..6 meses à frente */
  offset: number;
  label: string;
  name: string;
  total: number;
  installments: number;
  bills: number;
  items: ForecastItem[];
}

export const FORECAST_MONTHS = 6;

/** Previsão mês k (1..6): Σ bills + Σ plan.per para planos com cur + k ≤ n. */
export function forecast(plans: Plan[], bills: Bill[], cards: Card[], now: Date, accounts: Account[] = []): ForecastMonth[] {
  const cardName = (id: string) => cards.find((c) => c.id === id)?.name ?? '';
  const fixed = billsTotal(bills);
  return Array.from({ length: FORECAST_MONTHS }, (_, i) => {
    const k = i + 1;
    const due = plans.filter((p) => p.current + k <= p.installments);
    const installments = round2(due.reduce((a, p) => a + p.perInstallment, 0));
    const items: ForecastItem[] = [
      ...due.map((p) => ({
        id: `${p.id}-${k}`,
        kind: 'installment' as const,
        title: `${p.title} (${p.current + k}/${p.installments})`,
        subtitle: cardName(p.cardId),
        amount: p.perInstallment,
        tag: `${p.current + k}/${p.installments}`,
      })),
      ...bills.map((b) => ({
        id: `${b.id}-${k}`,
        kind: 'bill' as const,
        title: b.name,
        subtitle: `Conta fixa · dia ${b.dueDay}${billSourceName(b, cards, accounts) ? ` · ${billSourceName(b, cards, accounts)}` : ''}`,
        amount: b.amount,
        tag: 'FIXA',
      })),
    ];
    const name = monthName(k, now);
    return { offset: k, label: name.slice(0, 3), name, total: round2(installments + fixed), installments, bills: fixed, items };
  });
}

/** Altura relativa (min..100) de cada mês para gráficos. */
export function forecastHeights(months: ForecastMonth[], min = 8): number[] {
  const max = Math.max(...months.map((m) => m.total), 1);
  return months.map((m) => Math.max(min, Math.round((m.total / max) * 100)));
}

export interface ForecastSelection {
  month: ForecastMonth;
  /** soma do próximo mês até o selecionado (inclusive) */
  cumulative: number;
  /** quantos meses entram no acumulado */
  monthsCounted: number;
  /** % do limite mensal comprometido no mês selecionado (0 se não há limite) */
  pctOfBudget: number;
  /** limite − total do mês: positivo = sobra, negativo = passa do limite */
  leftover: number;
}

/**
 * Resumo do mês tocado na previsão: total do mês, acumulado desde o próximo mês e comparação com o
 * limite mensal. Offset fora da lista cai no primeiro mês.
 */
export function forecastSelection(months: ForecastMonth[], offset: number, budget: number): ForecastSelection | null {
  const idx = Math.max(0, months.findIndex((m) => m.offset === offset));
  const month = months[idx];
  if (!month) return null;
  const counted = months.slice(0, idx + 1);
  const cumulative = round2(counted.reduce((sum, m) => sum + m.total, 0));
  return {
    month,
    cumulative,
    monthsCounted: counted.length,
    pctOfBudget: budget > 0 ? Math.round((month.total / budget) * 100) : 0,
    leftover: round2(budget - month.total),
  };
}
