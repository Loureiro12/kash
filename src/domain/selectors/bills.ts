import { round2 } from '../money';
import type { Account, Bill, Card } from '../types';
import { isCardId } from '../types';

export interface BillsSummary {
  pendingTotal: number;
  paidCount: number;
  count: number;
}

export function billsSummary(bills: Bill[]): BillsSummary {
  const pending = bills.filter((b) => !b.paid);
  return { pendingTotal: round2(pending.reduce((a, b) => a + b.amount, 0)), paidCount: bills.length - pending.length, count: bills.length };
}

/** Contas não pagas, ordenadas por vencimento. */
export const upcomingBills = (bills: Bill[]): Bill[] => bills.filter((b) => !b.paid).sort((a, b) => a.dueDay - b.dueDay);

export const billsTotal = (bills: Bill[]): number => round2(bills.reduce((a, b) => a + b.amount, 0));

/** Contas fixas cobradas num cartão (cobranças recorrentes da fatura), ordenadas por dia. */
export const cardBills = (bills: Bill[], cardId: string): Bill[] => bills.filter((b) => b.sourceId === cardId).sort((a, b) => a.dueDay - b.dueDay);

/** Nome de onde a conta é cobrada ("Cartão principal" / "Conta corrente"), ou null. */
export function billSourceName(bill: Bill, cards: Card[], accounts: Account[]): string | null {
  if (!bill.sourceId) return null;
  return (isCardId(bill.sourceId) ? cards.find((c) => c.id === bill.sourceId)?.name : accounts.find((a) => a.id === bill.sourceId)?.name) ?? null;
}
