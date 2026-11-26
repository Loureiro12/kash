import { describe, expect, it } from 'vitest';
import { detectRecurring, recurringSuggestions } from '../selectors/recurring';
import { spendingAlerts } from '../selectors/spendingAlerts';
import type { Bill, Tx } from '../types';

let seq = 0;
const tx = (title: string, date: string, amount: number, extra: Partial<Tx> = {}): Tx => ({ id: `t${++seq}`, title, category: 'Assinaturas', amount: -amount, date, sourceId: 'card1', ...extra });
const now = new Date(2026, 10, 25, 10); // 25/11/2026
const monthly = (title: string, day: number, amounts: number[], fromMonth = 11 - amounts.length + 1) =>
  amounts.map((a, i) => tx(title, `2026-${String(fromMonth + i).padStart(2, '0')}-${String(day).padStart(2, '0')}`, a));

describe('detectRecurring', () => {
  it('assinatura mensal: valor, dia, custo no ano e a cobrança deste mês', () => {
    const txs = monthly('Netflix', 12, [39.9, 39.9, 39.9, 39.9]);
    const [c] = detectRecurring(txs, [], now);
    expect(c).toMatchObject({ key: 'netflix', title: 'Netflix', amount: 39.9, dueDay: 12, months: 4, yearly: 478.8, thisMonthTxId: txs[3]!.id, priceChange: null, isBill: false });
  });

  it('percebe aumento de preço e aceita dias um pouco diferentes', () => {
    const txs = [tx('Spotify', '2026-08-03', 21.9), tx('Spotify', '2026-09-05', 21.9), tx('spotify ', '2026-10-02', 21.9), tx('Spotify', '2026-11-04', 23.9)];
    expect(detectRecurring(txs, [], now)[0]!.priceChange).toEqual({ from: 21.9, to: 23.9, month: '2026-11' });
  });

  it('ignora o que se repete no mesmo mês, parcelas, poucos meses, parou de cobrar e valores muito diferentes', () => {
    const uber = [...monthly('Uber', 3, [20, 30, 25, 18]), tx('Uber', '2026-11-10', 22)];
    const plan = monthly('Celular (1/12)', 5, [100, 100, 100]).map((t) => ({ ...t, planId: 'p1' }));
    const short = monthly('Academia', 10, [99, 99]);
    const stopped = monthly('Globoplay', 8, [24.9, 24.9, 24.9], 6);
    const mercado = monthly('Mercado', 15, [300, 120, 480]);
    expect(detectRecurring([...uber, ...plan, ...short, ...stopped, ...mercado], [], now)).toEqual([]);
  });

  it('cobrança do dia 5 que ainda não veio em novembro (fatura não importada) continua valendo', () => {
    const [c] = detectRecurring(monthly('Academia', 5, [99, 99, 99], 8), [], now);
    expect(c).toMatchObject({ key: 'academia', thisMonthTxId: null, dueDay: 5 });
  });

  it('marca o que já é conta fixa e esconde os ignorados nas sugestões', () => {
    const bills: Bill[] = [{ id: 'b1', name: 'Netflix', amount: 39.9, dueDay: 12, paid: false, category: 'Assinaturas' }];
    const txs = [...monthly('NETFLIX.COM', 12, [39.9, 39.9, 39.9]), ...monthly('Academia Fit', 10, [99, 99, 99])];
    const all = detectRecurring(txs, bills, now);
    expect(all.map((c) => [c.key, c.isBill])).toEqual([['academia fit', false], ['netflix.com', true]]);
    expect(recurringSuggestions(all, new Set()).map((c) => c.key)).toEqual(['academia fit']);
    expect(recurringSuggestions(all, new Set(['academia fit']))).toEqual([]);
  });
});

describe('alerta de aumento', () => {
  it('avisa no mês do aumento, com a diferença no ano', () => {
    const txs = [...monthly('Netflix', 12, [39.9, 39.9, 44.9])];
    const a = spendingAlerts({ txs, cardIds: ['card1'], settings: { monthlyBudget: 0, cardBudget: 0 }, bills: [] }, now);
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({ id: 'price:netflix:2026-11', kind: 'price-increase', title: 'Netflix ficou mais cara', route: '/accounts?segmento=fixas' });
    expect(a[0]!.body).toBe('Passou de R$ 39,90 para R$ 44,90 por mês: R$ 60,00 a mais por ano.');
  });
});
