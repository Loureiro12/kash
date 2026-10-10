import { describe, expect, it } from 'vitest';
import { categoryBreakdown, previousMonthsSpent } from '../selectors/report';
import { monthIncome, monthSpent, totalBalance } from '../selectors/balance';
import { collapseTransfers, filterTxs, groupTxsByDay, txTotals, txViews } from '../selectors/transactions';
import { transferLegs, transferPreview } from '../selectors/transfers';
import { validateCategoryName } from '../categories';
import type { Account, Tx } from '../types';

const now = new Date(2026, 9, 15, 10);
const accounts: Account[] = [
  { id: 'acc1', name: 'Corrente', kind: 'Conta corrente', balance: 800, color: '#C6F432' },
  { id: 'acc2', name: 'Poupança', kind: 'Poupança', balance: 200, color: '#6BC5FF' },
];
const out: Tx = { id: 't-out', title: 'Reserva', category: 'Transferência', amount: -200, date: '2026-10-15', sourceId: 'acc1', transferId: 'tr1' };
const into: Tx = { id: 't-in', title: 'Reserva', category: 'Transferência', amount: 200, date: '2026-10-15', sourceId: 'acc2', transferId: 'tr1' };
const lunch: Tx = { id: 't-1', title: 'Almoço', category: 'Comida', amount: -30, date: '2026-10-15', sourceId: 'acc1' };
const salary: Tx = { id: 't-2', title: 'Salário', category: 'Entrada', amount: 1000, date: '2026-10-14', sourceId: 'acc1' };
const oldOut: Tx = { ...out, id: 'o-out', transferId: 'tr0', date: '2026-09-10' };
const oldIn: Tx = { ...into, id: 'o-in', transferId: 'tr0', date: '2026-09-10' };
const txs = [into, out, lunch, salary, oldOut, oldIn];

describe('transferência entre contas', () => {
  it('não conta como gasto nem como entrada, nem no relatório', () => {
    expect(monthSpent(txs, now)).toBe(30);
    expect(monthIncome(txs, now)).toBe(1000);
    expect(categoryBreakdown(txs, now).map((c) => c.name)).toEqual(['Comida']);
    expect(previousMonthsSpent(txs, now)).toEqual([0, 0, 0, 0, 0]);
  });

  it('o saldo total não muda (só troca de conta)', () => {
    expect(totalBalance(accounts)).toBe(1000);
  });

  it('aparece uma vez na lista, com origem → destino e sem sinal', () => {
    const views = txViews(txs, accounts, [], now);
    const tr = views.filter((v) => v.kind === 'transfer');
    expect(tr).toHaveLength(2);
    expect(tr[0]).toMatchObject({ id: 't-out', transferId: 'tr1', amount: 200, isExpense: false, initial: '⇄', meta: 'Hoje · Transferência · Corrente → Poupança' });
    expect(views.find((v) => v.id === 't-1')?.kind).toBe('expense');
  });

  it('sem a perna de saída na lista, mostra a de entrada', () => {
    const [only] = collapseTransfers([into]);
    expect(only?.tx.id).toBe('t-in');
  });

  it('filtros e totais da lista', () => {
    const month = { monthOffset: 0, category: null };
    expect(filterTxs(txs, { ...month, kind: 'transfer' }, now).map((t) => t.id).sort()).toEqual(['t-in', 't-out']);
    expect(filterTxs(txs, { ...month, kind: 'expense' }, now).map((t) => t.id)).toEqual(['t-1']);
    expect(filterTxs(txs, { ...month, kind: 'income' }, now).map((t) => t.id)).toEqual(['t-2']);
    const all = filterTxs(txs, { ...month, kind: 'all' }, now);
    expect(txTotals(all)).toEqual({ count: 3, spent: 30, income: 1000 });
    expect(groupTxsByDay(all, accounts, [], now)[0]?.items.map((i) => i.id)).toEqual(['t-out', 't-1']);
  });

  it('pernas e prévia dos saldos (nova e editando)', () => {
    const legs = transferLegs(txs, 'tr1');
    expect(legs).toMatchObject({ out: { id: 't-out' }, into: { id: 't-in' } });
    expect(transferLegs(txs, 'nao-existe')).toBeNull();
    expect(transferPreview(accounts, 'acc1', 'acc2', 100)).toEqual({ fromAfter: 700, toAfter: 300, fromNegative: false });
    // editando a de 200 para 50: desfaz a atual (800+200, 200−200) e aplica a nova
    expect(transferPreview(accounts, 'acc1', 'acc2', 50, legs)).toEqual({ fromAfter: 950, toAfter: 50, fromNegative: false });
    expect(transferPreview(accounts, 'acc2', 'acc1', 900).fromNegative).toBe(true);
  });

  it('"Transferência" é nome reservado', () => {
    expect(validateCategoryName('transferência', [])).toBe('“transferência” é reservado pelo app.');
  });
});
