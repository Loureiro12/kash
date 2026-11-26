import { describe, expect, it } from 'vitest';
import { nextSpendingAlert, spendingAlerts, weeklySummaryReminder, type SpendingAlertInput } from '../selectors/spendingAlerts';
import type { Tx } from '../types';

let seq = 0;
const tx = (date: string, amount: number, category = 'Comida', sourceId = 'acc1'): Tx => ({ id: `t${++seq}`, title: category, category, amount: -amount, date, sourceId });
const input = (txs: Tx[], monthlyBudget = 1000, cardBudget = 0): SpendingAlertInput => ({ txs, cardIds: ['card1'], settings: { monthlyBudget, cardBudget } });
// quarta, 25/11/2026, 10h
const now = new Date(2026, 10, 25, 10);

describe('alertas de limite', () => {
  it('80%: avisa o quanto sobra por dia; 100% cobre o de 80%', () => {
    const a = spendingAlerts(input([tx('2026-11-03', 820)]), now);
    expect(a[0]).toMatchObject({ id: 'budget:total:2026-11:80', kind: 'budget-80', title: 'Você já usou 82% do limite do mês' });
    expect(a[0]!.body).toBe('Sobram R$ 180,00 para 5 dias: uns R$ 36,00 por dia.');
    const b = spendingAlerts(input([tx('2026-11-03', 1100)]), now);
    expect(b[0]).toMatchObject({ id: 'budget:total:2026-11:100', title: 'Você passou o limite do mês', supersedes: ['budget:total:2026-11:80'] });
    expect(b[0]!.body).toContain('R$ 100,00 acima, e faltam 5 dias');
  });

  it('limite dividido: avisa o cartão separado, depois do total', () => {
    const a = spendingAlerts(input([tx('2026-11-03', 450, 'Lazer', 'card1'), tx('2026-11-04', 100)], 1000, 500), now);
    expect(a.map((x) => x.id)).toEqual(['budget:card:2026-11:80']);
    expect(a[0]!.title).toBe('Você já usou 90% do limite do cartão');
  });

  it('sem limite, transferência e pagamento de fatura não contam', () => {
    expect(spendingAlerts(input([tx('2026-11-03', 5000)], 0), now)).toEqual([]);
    const t = { ...tx('2026-11-03', 900, 'Transferência'), transferId: 'x' };
    expect(spendingAlerts(input([t, tx('2026-11-04', 900, 'Fatura')]), now).filter((x) => x.kind.startsWith('budget'))).toEqual([]);
  });
});

describe('ritmo', () => {
  it('projeção acima do limite antes dos 80%: um aviso por semana', () => {
    // dia 10: 600 em 10 dias → 1.800 no mês
    const day10 = new Date(2026, 10, 10, 10);
    const a = spendingAlerts(input([tx('2026-11-02', 600)], 1000), day10);
    expect(a[0]).toMatchObject({ kind: 'pace', id: 'pace:2026-11:2026-11-09', title: 'No ritmo atual, o mês fecha em R$ 1.800,00' });
    expect(a[0]!.body).toContain('Gastando até R$ 20,00 por dia');
    // começo do mês: ainda não
    expect(spendingAlerts(input([tx('2026-11-02', 300)]), new Date(2026, 10, 5, 10)).some((x) => x.kind === 'pace')).toBe(false);
  });
});

describe('categoria acima do normal', () => {
  const history = [tx('2026-10-25', 100, 'Lazer'), tx('2026-11-01', 100, 'Lazer'), tx('2026-11-08', 100, 'Lazer'), tx('2026-11-15', 100, 'Lazer')];
  it('últimos 7 dias bem acima da média semanal', () => {
    const a = spendingAlerts(input([...history, tx('2026-11-22', 260, 'Lazer')], 0), now);
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({ kind: 'category', id: 'category:Lazer:2026-11-23', title: 'Lazer: 160% acima do normal', route: '/category/Lazer' });
    expect(a[0]!.body).toBe('R$ 260,00 nos últimos 7 dias; costuma ser uns R$ 100,00 por semana.');
  });
  it('sem histórico suficiente ou excesso pequeno: nada', () => {
    expect(spendingAlerts(input([tx('2026-11-15', 30, 'Lazer'), tx('2026-11-22', 300, 'Lazer')], 0), now)).toEqual([]);
    expect(spendingAlerts(input([...history, tx('2026-11-22', 140, 'Lazer')], 0), now)).toEqual([]);
  });
});

describe('nextSpendingAlert', () => {
  it('mostra o mais importante; os demais e os cobertos ficam como avisados', () => {
    const alerts = spendingAlerts(input([tx('2026-11-03', 1100), tx('2026-10-25', 100, 'Lazer'), tx('2026-11-01', 100, 'Lazer'), tx('2026-11-08', 100, 'Lazer'), tx('2026-11-22', 300, 'Lazer')]), now);
    const first = nextSpendingAlert(alerts, new Set());
    expect(first.alert!.kind).toBe('budget-100');
    expect(first.markSent).toEqual(expect.arrayContaining(['budget:total:2026-11:100', 'budget:total:2026-11:80', 'category:Lazer:2026-11-23']));
    expect(nextSpendingAlert(alerts, new Set(first.markSent))).toEqual({ alert: null, markSent: [] });
  });
});

describe('resumo da semana', () => {
  it('domingo 19h com o total, a categoria maior e o que sobra no mês', () => {
    const r = weeklySummaryReminder(input([tx('2026-11-23', 80, 'Mercado'), tx('2026-11-24', 30), tx('2026-11-10', 200)]), now);
    expect(r).toMatchObject({ id: 'weekly:2026-11-29', kind: 'weekly-summary', at: '2026-11-29T19:00', title: 'Sua semana: R$ 110,00 em gastos', route: '/report?periodo=semana' });
    expect(r!.body).toBe('Mais em Mercado (R$ 80,00). Sobram R$ 690,00 no limite do mês.');
  });
  it('semana sem gasto ou domingo já depois das 19h: nada', () => {
    expect(weeklySummaryReminder(input([tx('2026-11-10', 200)]), now)).toBeNull();
    expect(weeklySummaryReminder(input([tx('2026-11-23', 80)]), new Date(2026, 10, 29, 20))).toBeNull();
  });
});
