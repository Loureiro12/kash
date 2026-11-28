import { describe, expect, it } from 'vitest';
import { activeTravelTag, cleanTag, tagSummary, tagTotals } from '../selectors/tags';
import type { Tx } from '../types';

let seq = 0;
const tx = (date: string, amount: number, category: string, tag?: string, extra: Partial<Tx> = {}): Tx => ({ id: `t${++seq}`, title: category, category, amount, date, sourceId: 'acc1', ...(tag ? { tag } : {}), ...extra });

const txs = [
  tx('2026-11-10', -300, 'Lazer', 'Viagem Floripa'),
  tx('2026-11-11', -120, 'Comida', 'viagem floripa'),
  tx('2026-11-12', -80, 'Comida', 'Viagem Floripa'),
  tx('2026-11-12', 50, 'Entrada', 'Viagem Floripa'),
  { ...tx('2026-11-12', -500, 'Transferência', 'Viagem Floripa'), transferId: 'x' },
  tx('2026-10-01', -40, 'Comida', 'Aniversário'),
  tx('2026-11-13', -99, 'Mercado'),
];

describe('tags', () => {
  it('cleanTag tira espaços extras e limita o tamanho', () => {
    expect(cleanTag('  Viagem   Floripa ')).toBe('Viagem Floripa');
    expect(cleanTag('   ')).toBeNull();
    expect(cleanTag('x'.repeat(40))).toHaveLength(30);
  });

  it('tagTotals junta caixa/acento diferentes, separa gasto e entrada, ignora transferência', () => {
    expect(tagTotals(txs)).toEqual([
      { tag: 'Viagem Floripa', spent: 500, income: 50, count: 4, from: '2026-11-10', to: '2026-11-12' },
      { tag: 'Aniversário', spent: 40, income: 0, count: 1, from: '2026-10-01', to: '2026-10-01' },
    ]);
  });

  it('tagSummary: por dia, por categoria e lançamentos', () => {
    const s = tagSummary(txs, 'VIAGEM FLORIPA', { Comida: '#f00' })!;
    expect(s).toMatchObject({ spent: 500, days: 3, perDay: 166.67, count: 4 });
    expect(s.categories).toEqual([
      { name: 'Lazer', amount: 300, pct: 60, color: expect.any(String) },
      { name: 'Comida', amount: 200, pct: 40, color: '#f00' },
    ]);
    expect(s.txs).toHaveLength(4);
    expect(tagSummary(txs, 'nada')).toBeNull();
  });

  it('modo viagem vale até o último dia (inclusive)', () => {
    const now = new Date(2026, 10, 20, 10);
    expect(activeTravelTag({ travelTag: 'Floripa', travelUntil: null }, now)).toBe('Floripa');
    expect(activeTravelTag({ travelTag: 'Floripa', travelUntil: '2026-11-20' }, now)).toBe('Floripa');
    expect(activeTravelTag({ travelTag: 'Floripa', travelUntil: '2026-11-19' }, now)).toBeNull();
    expect(activeTravelTag({ travelTag: null }, now)).toBeNull();
  });
});
