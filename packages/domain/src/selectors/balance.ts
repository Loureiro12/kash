import { isTransfer, type Account, type Tx } from '../types';
import { isSameMonth } from '../dates';
import { round2 } from '../money';

export const totalBalance = (accounts: Account[]): number => round2(accounts.reduce((a, x) => a + x.balance, 0));

/** Lançamentos do mês corrente. */
export const monthTxs = (txs: Tx[], now: Date): Tx[] => txs.filter((t) => isSameMonth(t.date, now));

export const monthSpent = (txs: Tx[], now: Date): number =>
  round2(monthTxs(txs, now).filter((t) => t.amount < 0 && t.category !== 'Fatura' && !isTransfer(t)).reduce((a, t) => a + Math.abs(t.amount), 0));

export const monthIncome = (txs: Tx[], now: Date): number =>
  round2(monthTxs(txs, now).filter((t) => t.amount > 0 && !isTransfer(t)).reduce((a, t) => a + t.amount, 0));
