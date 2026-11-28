import { describe, expect, it } from 'vitest';
import { lastClosedMonth, monthRecap, monthRecapReminder } from '../selectors/monthRecap';
import type { Tx } from '../types';

let seq = 0;
const tx = (date: string, amount: number, category = 'Comida', title = category, extra: Partial<Tx> = {}): Tx => ({ id: `t${++seq}`, title, category, amount, date, sourceId: 'acc1', ...extra });

const txs: Tx[] = [
  // setembro: 1.000 de gastos
  tx('2026-09-10', -1000, 'Mercado'),
  // outubro
  tx('2026-10-05', 5000, 'Entrada', 'Salário'),
  tx('2026-10-02', -600, 'Mercado', 'Mercado Extra'),
  tx('2026-10-02', -40, 'Comida', 'Padaria'),
  tx('2026-10-15', -300, 'Lazer', 'Show'),
  tx('2026-10-20', -260, 'Comida', 'Restaurante'),
  tx('2026-10-25', -900, 'Fatura', 'Fatura Nubank'),
  { ...tx('2026-10-26', -500, 'Transferência', 'Reserva'), transferId: 'x' },
];

describe('monthRecap', () => {
  it('outubro: entrou, saiu, guardou, maior categoria, maior gasto, dias sem gastar e comparação', () => {
    const r = monthRecap(txs, '2026-10', { settings: { monthlyBudget: 1500, cardBudget: 0 } })!;
    expect(r).toMatchObject({ month: '2026-10', name: 'outubro', previousName: 'setembro', year: 2026, income: 5000, spent: 1200, saved: 3800, savedPct: 76, spentVsPrevious: 20, noSpendDays: 28, daysInMonth: 31, txCount: 4 });
    expect(r.topCategory).toMatchObject({ name: 'Mercado', amount: 600, pct: 50 });
    expect(r.categories.map((c) => c.name)).toEqual(['Mercado', 'Comida', 'Lazer']);
    expect(r.biggest).toEqual({ title: 'Mercado Extra', amount: 600, date: '2026-10-02' });
    expect(r.budget).toEqual({ limit: 1500, spent: 1200, within: true, diff: 300 });
  });

  it('mês sem lançamentos: null; janeiro compara com dezembro', () => {
    expect(monthRecap(txs, '2026-08')).toBeNull();
    const jan = monthRecap([tx('2026-01-10', -50)], '2026-01')!;
    expect(jan.previousName).toBe('dezembro');
    expect(jan.spentVsPrevious).toBeNull();
    expect(jan.savedPct).toBeNull();
  });

  it('lastClosedMonth', () => {
    expect(lastClosedMonth(new Date(2026, 10, 1, 9))).toBe('2026-10');
    expect(lastClosedMonth(new Date(2027, 0, 3))).toBe('2026-12');
  });
});

describe('monthRecapReminder', () => {
  it('dia 1º do mês seguinte às 10h, abrindo a retrospectiva; nada sem lançamento no mês', () => {
    expect(monthRecapReminder(txs, new Date(2026, 9, 28, 9))).toEqual({
      id: 'recap:2026-10',
      kind: 'month-recap',
      title: 'Sua retrospectiva de outubro chegou',
      body: 'Veja quanto entrou, quanto saiu, onde você mais gastou e compare com o mês anterior.',
      at: '2026-11-01T10:00',
      route: '/recap?mes=2026-10',
    });
    expect(monthRecapReminder(txs, new Date(2026, 7, 10))).toBeNull();
  });
});
