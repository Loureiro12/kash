import { describe, expect, it } from 'vitest';
import { periodRange, periodReport } from '../selectors/periodReport';
import { toISODate } from '../dates';
import type { Tx } from '../types';

// quarta-feira, 25/11/2026
const now = new Date(2026, 10, 25, 15);
let n = 0;
const tx = (over: Partial<Tx>): Tx => ({ id: `t${n++}`, title: 'x', category: 'Comida', amount: -10, date: '2026-11-25', sourceId: 'acc1', ...over });

const txs: Tx[] = [
  // esta semana (seg 23 – dom 29)
  tx({ title: 'iFood', amount: -60, date: '2026-11-25' }),
  tx({ title: 'Uber', category: 'Transporte', amount: -25, date: '2026-11-25' }),
  tx({ title: 'Salário', category: 'Entrada', amount: 3000, date: '2026-11-25' }),
  tx({ title: 'Padaria', amount: -15, date: '2026-11-24' }),
  tx({ title: 'Mercado', category: 'Mercado', amount: -200, date: '2026-11-23' }),
  // não contam como gasto
  tx({ title: 'Fatura', category: 'Fatura', amount: -900, date: '2026-11-24' }),
  tx({ title: 'Poupança', category: 'Transferência', amount: -500, date: '2026-11-24', transferId: 'tr1' }),
  // semana passada (seg 16 – dom 22): até quarta 18 = 100; inteira = 400
  tx({ title: 'Cinema', category: 'Lazer', amount: -100, date: '2026-11-18' }),
  tx({ title: 'Show', category: 'Lazer', amount: -300, date: '2026-11-21' }),
  // outubro
  tx({ title: 'Mercado', category: 'Mercado', amount: -600, date: '2026-10-10' }),
  tx({ title: 'Aluguel', category: 'Outros', amount: -1000, date: '2026-10-05' }),
  // setembro
  tx({ title: 'Mercado', category: 'Mercado', amount: -800, date: '2026-09-15' }),
];

describe('períodos', () => {
  it('semana começa na segunda; mês e dia pelo calendário', () => {
    const w = periodRange('week', 0, now);
    expect([toISODate(w.start), toISODate(w.end)]).toEqual(['2026-11-23', '2026-11-30']);
    const lastWeek = periodRange('week', -1, now);
    expect(toISODate(lastWeek.start)).toBe('2026-11-16');
    const m = periodRange('month', -1, now);
    expect([toISODate(m.start), toISODate(m.end)]).toEqual(['2026-10-01', '2026-11-01']);
    // domingo ainda é da semana que começou na segunda anterior
    expect(toISODate(periodRange('week', 0, new Date(2026, 10, 29)).start)).toBe('2026-11-23');
  });
});

describe('relatório do dia', () => {
  it('hoje: gastos, entradas, categorias e a semana do dia nas barras', () => {
    const r = periodReport(txs, 'day', 0, now, { monthlyBudget: 1800 });
    expect(r.label).toBe('Hoje');
    expect(r.subtitle).toBe('quarta, 25 de novembro');
    expect([r.spent, r.income, r.net, r.count]).toEqual([85, 3000, 2915, 2]);
    expect(r.categories.map((c) => [c.name, c.amount, c.pct])).toEqual([
      ['Comida', 60, 71],
      ['Transporte', 25, 29],
    ]);
    expect(r.delta.message).toBe('467% a mais que ontem');
    // limite do dia = 1800 / 30
    expect(r.budget).toMatchObject({ limit: 60, left: -25, message: 'Passou R$ 25,00 do limite do dia' });
    expect(r.bars.map((b) => b.label)).toEqual(['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']);
    expect(r.bars.find((b) => b.selected)?.date).toBe('2026-11-25');
    expect(r.bars.filter((b) => b.future).map((b) => b.label)).toEqual(['qui', 'sex', 'sáb', 'dom']);
    expect(r.canGoForward).toBe(false);
    expect(r.canGoBack).toBe(true);
  });

  it('dia passado: rótulo com a data e lista com tudo que aconteceu', () => {
    const r = periodReport(txs, 'day', -1, now);
    expect(r.label).toBe('Ontem');
    expect(r.spent).toBe(15);
    // fatura e transferência aparecem na lista, mas não somam no gasto
    expect(r.txs.map((t) => t.title).sort()).toEqual(['Fatura', 'Padaria', 'Poupança']);
    expect(periodReport(txs, 'day', -7, now).label).toBe('qua, 18 nov');
  });
});

describe('relatório da semana', () => {
  it('compara com a semana passada até o mesmo dia e mostra o dia de pico', () => {
    const r = periodReport(txs, 'week', 0, now, { monthlyBudget: 1800 });
    expect(r.label).toBe('Esta semana');
    expect(r.subtitle).toBe('23 – 29 nov');
    expect(r.spent).toBe(300);
    expect(r.elapsedDays).toBe(3);
    expect(r.perDay).toBe(100);
    // semana passada até quarta: 100 → +200%
    expect(r.delta.message).toBe('200% a mais que a semana passada até quarta');
    expect(r.peakDay).toMatchObject({ date: '2026-11-23', amount: 200, label: 'segunda, 23 nov' });
    // limite da semana = 1800 × 7 / 30
    expect(r.budget).toMatchObject({ limit: 420, left: 120, message: 'Sobram R$ 120,00 do limite da semana' });
  });

  it('semana passada inteira e a média das anteriores', () => {
    const r = periodReport(txs, 'week', -1, now);
    expect(r.label).toBe('Semana passada');
    expect(r.spent).toBe(400);
    expect(r.delta.message).toBe('Sem gastos na semana anterior pra comparar');
    expect(periodReport(txs, 'week', -3, now).subtitle).toBe('2 – 8 nov');
    expect(periodReport(txs, 'week', -4, now).subtitle).toBe('26 out – 1 nov');
  });
});

describe('relatório do mês', () => {
  it('mês atual: comparação até o mesmo dia, projeção e média dos meses completos', () => {
    const r = periodReport(txs, 'month', 0, now, { monthlyBudget: 1800 });
    expect(r.label).toBe('Novembro');
    expect(r.spent).toBe(700);
    expect(r.bars).toHaveLength(30);
    // outubro até o dia 25: 1600
    expect(r.delta.message).toBe('56% a menos que outubro até o dia 25');
    // 700 em 25 dias → 840 em 30
    expect(r.budget?.projected).toBe(840);
    expect(r.budget?.message).toBe('No ritmo atual, você fecha o mês em R$ 840,00, dentro do limite');
    // média de setembro (800) e outubro (1600); agosto não conta (antes do 1º lançamento)
    expect(r.average).toMatchObject({ value: 1200, periods: 2, message: 'Sua média é R$ 1.200,00 por mês' });
  });

  it('mês passado completo: diz se ficou acima ou abaixo da média e não avança além de hoje', () => {
    const r = periodReport(txs, 'month', -1, now, { monthlyBudget: 1800 });
    expect(r.label).toBe('Outubro');
    expect(r.spent).toBe(1600);
    expect(r.average?.message).toBe('Acima da sua média de R$ 800,00 por mês');
    expect(r.budget?.message).toBe('Ficou R$ 200,00 abaixo do limite do mês');
    expect(r.top.map((t) => t.title)).toEqual(['Aluguel', 'Mercado']);
    expect(periodReport(txs, 'month', 3, now).offset).toBe(0);
    expect(periodReport(txs, 'month', -14, now).label).toBe('Setembro de 2025');
  });

  it('sem lançamentos: zera tudo sem quebrar', () => {
    const r = periodReport([], 'month', 0, now, { monthlyBudget: 0 });
    expect([r.spent, r.income, r.count]).toEqual([0, 0, 0]);
    expect(r.delta.message).toBe('Nenhum gasto por aqui');
    expect(r.average).toBeNull();
    expect(r.budget).toBeNull();
    expect(r.peakDay).toBeNull();
    expect(r.canGoBack).toBe(false);
  });
});
