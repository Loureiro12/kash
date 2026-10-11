import { isSameMonth } from '../dates';
import { formatBRL, round2 } from '../money';
import { isTransfer, type Settings, type Tx } from '../types';

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

export interface BudgetPart {
  budget: number;
  spent: number;
  status: BudgetStatus;
}

export interface BudgetSplit {
  /** limite total (cartão + restante) e tudo o que saiu no mês */
  total: BudgetPart;
  /** só quando o limite está dividido (cardBudget > 0) */
  card: BudgetPart | null;
  rest: BudgetPart | null;
}

/**
 * Gasto do mês dividido entre cartão e o restante.
 * - Cartão: a fatura do mês de todos os cartões (o mesmo "Fatura atual" da tela Cartões).
 * - Restante: saídas das contas (débito, Pix, dinheiro), sem o pagamento da fatura (já contado
 *   no cartão) e sem transferências entre contas.
 */
export function budgetSplit(txs: readonly Tx[], cardIds: readonly string[], settings: Pick<Settings, 'monthlyBudget' | 'cardBudget'>, now: Date): BudgetSplit {
  const cards = new Set(cardIds);
  let card = 0;
  let rest = 0;
  for (const t of txs) {
    if (t.amount >= 0 || !isSameMonth(t.date, now) || isTransfer(t)) continue;
    const isCard = t.sourceType ? t.sourceType === 'card' : cards.has(t.sourceId);
    if (isCard) card += Math.abs(t.amount);
    else if (t.category !== 'Fatura') rest += Math.abs(t.amount);
  }
  card = round2(card);
  rest = round2(rest);
  const total = settings.monthlyBudget;
  const cardBudget = Math.min(settings.cardBudget || 0, total);
  const part = (budget: number, spent: number): BudgetPart => ({ budget, spent, status: budgetStatus(spent, budget) });
  return {
    total: part(total, round2(card + rest)),
    card: cardBudget > 0 ? part(cardBudget, card) : null,
    rest: cardBudget > 0 ? part(round2(total - cardBudget), rest) : null,
  };
}
