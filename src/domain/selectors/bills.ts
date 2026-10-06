import { round2 } from '../money';
import type { Bill } from '../types';

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
