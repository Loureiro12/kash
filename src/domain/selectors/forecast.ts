import type { Bill, Card, Plan } from '../types';
import { monthName } from '../dates';
import { round2 } from '../money';
import { billsTotal } from './bills';

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
export function forecast(plans: Plan[], bills: Bill[], cards: Card[], now: Date): ForecastMonth[] {
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
        subtitle: `Conta fixa · dia ${b.dueDay}`,
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
