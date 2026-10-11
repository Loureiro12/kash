import { describe, expect, it } from 'vitest';
import { categoryDetail } from '../selectors/categoryDetail';
import type { Tx } from '../types';

const now = new Date(2026, 9, 15);
let n = 0;
const tx = (over: Partial<Tx>): Tx => ({ id: `t${n++}`, title: 'x', category: 'Comida', amount: -10, date: '2026-10-05', sourceId: 'acc1', ...over });

const txs: Tx[] = [
  tx({ title: 'iFood', amount: -60, date: '2026-10-12' }),
  tx({ title: 'Padaria', amount: -20, date: '2026-10-10' }),
  tx({ title: 'ifood ', amount: -40, date: '2026-10-03' }),
  tx({ title: 'Mercado', category: 'Mercado', amount: -280, date: '2026-10-02' }),
  tx({ title: 'Fatura', category: 'Fatura', amount: -900, date: '2026-10-07' }),
  tx({ title: 'Salário', category: 'Entrada', amount: 3000, date: '2026-10-05' }),
  tx({ title: 'Restaurante', amount: -150, date: '2026-09-20' }),
  tx({ title: 'Pizza', amount: -50, date: '2026-05-20' }),
];

describe('detalhe de uma categoria', () => {
  it('mês atual: total, fatia dos gastos, média, comparação e onde mais gastou', () => {
    const d = categoryDetail(txs, 'Comida', now);
    expect(d.selected).toMatchObject({ offset: 0, name: 'outubro', total: 120 });
    expect(d.count).toBe(3);
    expect(d.average).toBe(40);
    // 120 de 400 gastos no mês (fatura não conta, entrada não é gasto)
    expect(d.sharePct).toBe(30);
    expect(d.delta.message).toBe('20% a menos que setembro');
    // "iFood" e "ifood " são o mesmo lugar
    expect(d.places).toEqual([
      { title: 'iFood', amount: 100, count: 2, pct: 83 },
      { title: 'Padaria', amount: 20, count: 1, pct: 17 },
    ]);
    expect(d.txs.map((t) => t.title)).toEqual(['iFood', 'Padaria', 'ifood ']);
  });

  it('barras dos últimos 6 meses; tocar num mês mostra o dele', () => {
    const d = categoryDetail(txs, 'Comida', now, -1);
    expect(d.months.map((m) => [m.label, m.total])).toEqual([
      ['mai', 50],
      ['jun', 0],
      ['jul', 0],
      ['ago', 0],
      ['set', 150],
      ['out', 120],
    ]);
    expect(d.months.map((m) => m.height)).toEqual([33, 6, 6, 6, 100, 80]);
    expect(d.selected).toMatchObject({ name: 'setembro', total: 150 });
    expect(d.delta.message).toBe('Sem gastos em agosto pra comparar');
    expect(d.sharePct).toBe(100);
  });

  it('mês sem gastos na categoria', () => {
    const d = categoryDetail(txs, 'Lazer', now);
    expect([d.selected.total, d.count, d.average, d.places]).toEqual([0, 0, 0, []]);
    expect(d.delta.message).toBe('Nada em Lazer em outubro');
  });
});
