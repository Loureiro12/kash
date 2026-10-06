import { formatBRL } from '../money';

export interface BudgetStatus {
  /** 0..100 */
  pct: number;
  /** positivo = sobra, negativo = passou */
  left: number;
  message: string;
}

/** Orçamento mensal: pct = min(100, gasto/limite). */
export function budgetStatus(spent: number, budget: number): BudgetStatus {
  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const left = budget - spent;
  const message = left > 0 ? `Sobram ${formatBRL(left)} pra fechar o mês no verde` : `Passou ${formatBRL(-left)} do limite do mês`;
  return { pct, left, message };
}
