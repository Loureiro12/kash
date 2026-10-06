import { monthKey, monthKeyName, monthKeysBetween, monthKeyToDate, toISODate } from '../dates';
import { round2 } from '../money';
import type { Bill, Card, Invoice, Plan, Tx } from '../types';

export interface RolloverInput {
  lastRolloverMonth: string;
  cards: Card[];
  txs: Tx[];
  bills: Bill[];
  plans: Plan[];
  invoices: Invoice[];
}

export interface RolloverResult extends RolloverInput {
  /** meses processados */
  months: string[];
}

/** Lançamentos de um cartão num mês "yyyy-mm" (só saídas). */
export function cardMonthTotal(txs: Tx[], cardId: string, month: string): number {
  return round2(txs.filter((t) => t.sourceId === cardId && t.amount < 0 && t.date.startsWith(month)).reduce((a, t) => a + Math.abs(t.amount), 0));
}

/**
 * Virada de mês: para cada mês entre o último processado e o atual —
 * fecha a fatura de cada cartão (total do mês anterior), zera "paga" das contas fixas
 * e lança a próxima parcela de cada parcelamento no dia 1º.
 * Função pura; `makeId` injeta a geração de ids.
 */
export function rollover(input: RolloverInput, now: Date, makeId: (prefix: string) => string): RolloverResult {
  const current = monthKey(now);
  const months = monthKeysBetween(input.lastRolloverMonth, current);
  if (months.length === 0) return { ...input, months };

  let { txs, bills, plans, invoices } = input;
  for (const month of months) {
    const prev = monthKeyToDate(month);
    prev.setMonth(prev.getMonth() - 1);
    const closedMonth = monthKey(prev);
    // 1. fatura fechada do mês anterior
    for (const card of input.cards) {
      if (invoices.some((i) => i.cardId === card.id && i.month === closedMonth)) continue;
      const total = cardMonthTotal(txs, card.id, closedMonth);
      if (total > 0) invoices = [...invoices, { id: makeId('inv'), cardId: card.id, month: closedMonth, total, paid: false }];
    }
    // 2. contas fixas voltam a "a pagar"
    bills = bills.map((b) => (b.paid ? { ...b, paid: false, paidTxId: undefined } : b));
    // 3. próxima parcela de cada plano
    const firstDay = toISODate(monthKeyToDate(month));
    plans = plans.map((p) => {
      if (p.current >= p.installments) return p;
      const current = p.current + 1;
      txs = [{ id: makeId('tx'), title: `${p.title} (${current}/${p.installments})`, category: p.category, amount: -p.perInstallment, date: firstDay, sourceId: p.cardId, planId: p.id }, ...txs];
      return { ...p, current };
    });
  }
  return { ...input, lastRolloverMonth: current, txs, bills, plans, invoices, months };
}

export interface InvoiceView extends Invoice {
  cardName: string;
  /** "setembro" */
  monthName: string;
  /** "05 out" */
  dueLabel: string;
  /** ISO do vencimento (mês seguinte ao de competência, no dia do cartão) */
  dueDate: string;
}

export function invoiceView(invoice: Invoice, cards: Card[]): InvoiceView {
  const card = cards.find((c) => c.id === invoice.cardId);
  const due = monthKeyToDate(invoice.month);
  due.setMonth(due.getMonth() + 1);
  due.setDate(Math.min(card?.dueDay ?? 1, 28));
  const dueLabel = `${String(due.getDate()).padStart(2, '0')} ${monthKeyName(monthKey(due)).slice(0, 3)}`;
  return { ...invoice, cardName: card?.name ?? '', monthName: monthKeyName(invoice.month), dueLabel, dueDate: toISODate(due) };
}

/** Faturas de um cartão, mais recentes primeiro. */
export const cardInvoices = (invoices: Invoice[], cardId: string): Invoice[] => invoices.filter((i) => i.cardId === cardId).sort((a, b) => (a.month < b.month ? 1 : -1));

export const openInvoices = (invoices: Invoice[]): Invoice[] => invoices.filter((i) => !i.paid).sort((a, b) => (a.month < b.month ? -1 : 1));
