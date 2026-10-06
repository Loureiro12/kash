import { seedData } from '../fixtures/seed';
import { cardMonthTotal, invoiceView, openInvoices, rollover } from '../selectors/rollover';
import { monthKey, monthKeysBetween } from '../dates';

const now = new Date(2026, 9, 15, 10); // 15 out 2026
const seed = seedData(now);
let n = 0;
const makeId = (p: string) => `${p}_${++n}`;

describe('virada de mês', () => {
  it('monthKeysBetween lista os meses a processar', () => {
    expect(monthKeysBetween('2026-10', '2026-10')).toEqual([]);
    expect(monthKeysBetween('2026-07', '2026-10')).toEqual(['2026-08', '2026-09', '2026-10']);
    expect(monthKeysBetween('2025-11', '2026-01')).toEqual(['2025-12', '2026-01']);
  });
  it('nada a fazer quando o mês já foi processado', () => {
    const r = rollover({ lastRolloverMonth: monthKey(now), cards: seed.cards, txs: seed.txs, bills: seed.bills, plans: seed.plans, invoices: [] }, now, makeId);
    expect(r.months).toEqual([]);
    expect(r.txs).toBe(seed.txs);
  });
  it('fecha a fatura do mês anterior, zera contas pagas e lança a parcela do mês', () => {
    const txs = [...seed.txs, { id: 'old1', title: 'Pizza', category: 'Comida' as const, amount: -58, date: '2026-09-30', sourceId: 'card1' }, { id: 'old2', title: 'Jogo', category: 'Lazer' as const, amount: -79.9, date: '2026-09-28', sourceId: 'card2' }];
    const r = rollover({ lastRolloverMonth: '2026-09', cards: seed.cards, txs, bills: seed.bills, plans: seed.plans, invoices: [] }, now, makeId);
    expect(r.months).toEqual(['2026-10']);
    expect(r.lastRolloverMonth).toBe('2026-10');
    expect(r.invoices).toHaveLength(2);
    expect(r.invoices.find((i) => i.cardId === 'card1')).toMatchObject({ month: '2026-09', total: 58, paid: false });
    expect(r.invoices.find((i) => i.cardId === 'card2')).toMatchObject({ month: '2026-09', total: 79.9 });
    expect(r.bills.every((b) => !b.paid && !b.paidTxId)).toBe(true);
    expect(r.plans.find((p) => p.id === 'plan1')?.current).toBe(6);
    expect(r.plans.find((p) => p.id === 'plan2')?.current).toBe(4);
    const generated = r.txs.filter((t) => t.date === '2026-10-01');
    expect(generated.map((t) => t.title).sort()).toEqual(['Celular novo (6/12)', 'Tênis de corrida (4/6)']);
  });
  it('não lança parcela de plano concluído nem duplica fatura já existente', () => {
    const plans = [{ ...seed.plans[0]!, current: 12 }];
    const existing = [{ id: 'inv_x', cardId: 'card1', month: '2026-09', total: 10, paid: true }];
    const r = rollover({ lastRolloverMonth: '2026-09', cards: seed.cards, txs: seed.txs, bills: [], plans, invoices: existing }, now, makeId);
    expect(r.plans[0]?.current).toBe(12);
    expect(r.invoices.filter((i) => i.cardId === 'card1')).toHaveLength(1);
  });
  it('processa vários meses de uma vez', () => {
    const r = rollover({ lastRolloverMonth: '2026-07', cards: seed.cards, txs: seed.txs, bills: seed.bills, plans: seed.plans, invoices: [] }, now, makeId);
    expect(r.months).toEqual(['2026-08', '2026-09', '2026-10']);
    expect(r.plans.find((p) => p.id === 'plan2')?.current).toBe(6);
  });
  it('cardMonthTotal, invoiceView e openInvoices', () => {
    expect(cardMonthTotal(seed.txs, 'card1', '2026-10')).toBe(405.1);
    const v = invoiceView({ id: 'i', cardId: 'card1', month: '2026-09', total: 100, paid: false }, seed.cards);
    expect(v).toMatchObject({ cardName: 'Cartão principal', monthName: 'setembro', dueLabel: '05 out', dueDate: '2026-10-05' });
    expect(openInvoices([{ id: 'a', cardId: 'card1', month: '2026-09', total: 1, paid: true }, { id: 'b', cardId: 'card1', month: '2026-08', total: 1, paid: false }]).map((i) => i.id)).toEqual(['b']);
  });
});
