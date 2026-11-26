import { describe, expect, it } from 'vitest';
import { calendarMonthGrid, shiftMonthKey, spokenDate } from '../dates';
import { normalizeTitle, suggestFromHistory } from '../suggest';
import type { Tx } from '../types';

const tx = (p: Partial<Tx>): Tx => ({ id: Math.random().toString(36), title: 'x', category: 'Outros', amount: -10, date: '2026-11-01', sourceId: 'acc1', ...p });

describe('suggestFromHistory', () => {
  it('usa o gasto mais recente com a mesma descrição, sem caixa nem acento', () => {
    const txs = [
      tx({ title: 'Padaria São José', category: 'Comida', sourceId: 'acc1', date: '2026-10-01' }),
      tx({ title: 'padaria sao jose', category: 'Mercado', sourceId: 'c1', date: '2026-11-10' }),
    ];
    expect(suggestFromHistory(txs, '  PADARIA  são josé ')).toEqual({ category: 'Mercado', sourceId: 'c1' });
  });

  it('ignora entradas, transferências, faturas e textos curtos', () => {
    const txs = [
      tx({ title: 'Salário', category: 'Entrada', amount: 5000 }),
      tx({ title: 'Reserva', category: 'Transferência', transferId: 't1' }),
      tx({ title: 'Fatura Nubank', category: 'Fatura' }),
      tx({ title: 'Uber', category: 'Transporte' }),
    ];
    expect(suggestFromHistory(txs, 'salário')).toBeNull();
    expect(suggestFromHistory(txs, 'reserva')).toBeNull();
    expect(suggestFromHistory(txs, 'fatura nubank')).toBeNull();
    expect(suggestFromHistory(txs, 'ub')).toBeNull();
    expect(suggestFromHistory(txs, 'uber')).toEqual({ category: 'Transporte', sourceId: 'acc1' });
  });

  it('normalizeTitle', () => {
    expect(normalizeTitle(' Açaí  da Esquina ')).toBe('acai da esquina');
  });
});

describe('calendário', () => {
  it('nov/2026 começa no domingo e tem 5 semanas', () => {
    const g = calendarMonthGrid('2026-11');
    expect(g).toHaveLength(5);
    expect(g[0]![0]).toBe('2026-11-01');
    expect(g[4]).toEqual(['2026-11-29', '2026-11-30', null, null, null, null, null]);
  });

  it('fev/2026 (começa no domingo, 28 dias) cabe em 4 semanas; out/2026 abre com 4 vazios', () => {
    expect(calendarMonthGrid('2026-02')).toHaveLength(4);
    expect(calendarMonthGrid('2026-10')[0]).toEqual([null, null, null, null, '2026-10-01', '2026-10-02', '2026-10-03']);
  });

  it('shiftMonthKey atravessa o ano e spokenDate fala o dia', () => {
    expect(shiftMonthKey('2026-01', -1)).toBe('2025-12');
    expect(shiftMonthKey('2026-12', 1)).toBe('2027-01');
    expect(spokenDate('2026-11-23')).toBe('segunda, 23 de novembro');
  });
});
