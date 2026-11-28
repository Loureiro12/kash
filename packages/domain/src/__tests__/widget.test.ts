import { describe, expect, it } from 'vitest';
import { widgetSummary } from '../selectors/widget';
import type { Tx } from '../types';

const now = new Date(2026, 10, 28, 15);
const tx = (date: string, amount: number, category = 'Comida'): Tx => ({ id: `${date}${amount}`, title: 'x', category, amount, date, sourceId: 'acc1' });
const txs = [tx('2026-11-28', -45.9), tx('2026-11-28', -10), tx('2026-11-28', 500, 'Entrada'), tx('2026-11-10', -1000)];

describe('widgetSummary', () => {
  it('hoje e quanto sobra no limite', () => {
    expect(widgetSummary({ txs, cardIds: [], settings: { monthlyBudget: 1800, cardBudget: 0, hideValues: false } }, now)).toEqual({
      day: '2026-11-28', today: 'R$ 55,90', left: 'R$ 744,10', leftLabel: 'Sobram no mês', pct: 59, over: false, hidden: false, signedIn: 1,
    });
  });
  it('passou do limite; sem limite mostra o gasto do mês; ocultar valores', () => {
    expect(widgetSummary({ txs, cardIds: [], settings: { monthlyBudget: 1000, cardBudget: 0, hideValues: false } }, now)).toMatchObject({ left: 'R$ 55,90', leftLabel: 'Passou do limite', pct: 100, over: true });
    expect(widgetSummary({ txs, cardIds: [], settings: { monthlyBudget: 0, cardBudget: 0, hideValues: false } }, now)).toMatchObject({ left: 'R$ 1.055,90', leftLabel: 'Gasto no mês', pct: 0 });
    const hidden = widgetSummary({ txs, cardIds: [], settings: { monthlyBudget: 1800, cardBudget: 0, hideValues: true } }, now);
    expect(hidden.today).not.toContain('55');
    expect(hidden.hidden).toBe(true);
  });
});
