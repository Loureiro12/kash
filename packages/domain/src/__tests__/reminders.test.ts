import { seedData } from '../fixtures/seed';
import { MAX_REMINDERS, planReminders, reminderShortLabel } from '../selectors/reminders';

const now = new Date(2026, 9, 6, 10); // 6 out 2026, 10h
const seed = seedData(now);
const base = { bills: seed.bills, invoices: seed.invoices, cards: seed.cards, goals: seed.goals, settings: { billReminder: true } };

describe('plano de lembretes', () => {
  it('desligado → nenhum lembrete', () => {
    expect(planReminders({ ...base, settings: { billReminder: false } }, now)).toEqual([]);
  });
  it('contas fixas: 2 dias antes do vencimento, pulando as pagas e as já passadas', () => {
    const r = planReminders(base, now).filter((x) => x.kind === 'bill');
    const ids = r.map((x) => x.id.split(':')[1]);
    // aluguel (dia 5) está pago → só no próximo mês; internet (dia 10) → aviso dia 8
    expect(ids).toContain('bill2');
    expect(r.find((x) => x.id.startsWith('bill:bill2'))).toMatchObject({ at: '2026-10-08T09:00', title: 'Internet vence em 2 dias', route: '/accounts' });
    expect(r.find((x) => x.id.startsWith('bill:bill1'))?.at).toBe('2026-11-03T09:00');
  });
  it('fatura em aberto: 2 dias antes de vencer (dia 5 do mês seguinte ao de competência)', () => {
    const r = planReminders(base, now).find((x) => x.kind === 'invoice');
    // fatura de setembro vence 05 out; o aviso (03 out) já passou em 06 out → nada
    expect(r).toBeUndefined();
    const early = planReminders(base, new Date(2026, 9, 1, 10)).find((x) => x.kind === 'invoice');
    expect(early).toMatchObject({ at: '2026-10-03T09:00', route: '/cards' });
    expect(early?.title).toMatch(/Fatura do Cartão principal/);
  });
  it('metas: no dia do depósito, só se ainda não depositou', () => {
    const r = planReminders(base, now).filter((x) => x.kind === 'goal-deposit');
    expect(r.find((x) => x.id.startsWith('goal:goal1'))).toMatchObject({ at: '2026-10-10T09:00', route: '/goals' });
    const deposited = { ...base, goals: seed.goals.map((g) => (g.id === 'goal1' ? { ...g, lastDepositDate: '2026-10-02' } : g)) };
    expect(planReminders(deposited, now).find((x) => x.id.startsWith('goal:goal1'))?.at).toBe('2026-11-10T09:00');
  });
  it('aviso de faturas fechadas no dia 1º do próximo mês', () => {
    const r = planReminders(base, now).find((x) => x.kind === 'invoices-closed');
    expect(r).toMatchObject({ at: '2026-11-01T09:00', title: 'Faturas de outubro fecharam' });
    expect(planReminders({ ...base, cards: [] }, now).some((x) => x.kind === 'invoices-closed')).toBe(false);
  });
  it('ordenado por data, limitado e com rótulo curto', () => {
    const r = planReminders(base, now);
    expect(r.length).toBeLessThanOrEqual(MAX_REMINDERS);
    expect([...r].sort((a, b) => (a.at < b.at ? -1 : 1))).toEqual(r);
    expect(reminderShortLabel(r[0]!)).toBe('Internet, 8 out');
  });
});
