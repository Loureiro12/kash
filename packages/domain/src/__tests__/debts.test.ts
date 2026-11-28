import { describe, expect, it } from 'vitest';
import { debtChargeMessage, debtDueLabel, debtReminders, debtsSummary, splitShare } from '../selectors/debts';
import type { Debt } from '../types';

const now = new Date(2026, 10, 28, 9);
const debt = (p: Partial<Debt>): Debt => ({ id: 'd', person: 'João', description: '', amount: 50, kind: 'lent', date: '2026-11-20', dueDate: null, settledAt: null, ...p });

describe('quem me deve', () => {
  const list = [
    debt({ id: 'a', person: 'João Silva', amount: 60, kind: 'split', description: 'jantar', dueDate: '2026-12-01' }),
    debt({ id: 'b', person: 'Ana', amount: 200, dueDate: '2026-11-25' }),
    debt({ id: 'c', person: 'joão silva', amount: 40 }),
    debt({ id: 'd', person: 'Bia', amount: 30, settledAt: '2026-11-27' }),
  ];

  it('resumo: a receber, atrasadas primeiro, por pessoa', () => {
    const s = debtsSummary(list, now);
    expect(s).toMatchObject({ pendingTotal: 300, pendingCount: 3, overdueCount: 1 });
    expect(s.pending.map((d) => d.id)).toEqual(['b', 'a', 'c']);
    expect(s.settled.map((d) => d.id)).toEqual(['d']);
    expect(s.byPerson).toEqual([
      { person: 'Ana', total: 200, count: 1 },
      { person: 'João Silva', total: 100, count: 2 },
    ]);
  });

  it('rótulo da data de cobrar', () => {
    expect(debtDueLabel(list[1]!, now)).toBe('atrasado desde 25 nov');
    expect(debtDueLabel(list[0]!, now)).toBe('cobrar em 3 dias');
    expect(debtDueLabel(debt({ dueDate: '2026-11-28' }), now)).toBe('cobrar hoje');
    expect(debtDueLabel(debt({ dueDate: '2026-11-29' }), now)).toBe('cobrar amanhã');
    expect(debtDueLabel(list[2]!, now)).toBe('sem data para cobrar');
    expect(debtDueLabel(list[3]!, now)).toBe('recebido ontem');
  });

  it('lembretes só das pendentes com data futura, às 10h', () => {
    expect(debtReminders(list, now)).toEqual([
      { id: 'debt:a:2026-12-01', kind: 'debt', title: 'Hora de cobrar João Silva', body: 'R$ 60,00 · jantar. Toque para mandar o lembrete.', at: '2026-12-01T10:00', route: '/accounts?segmento=receber' },
    ]);
    // hoje antes das 10h ainda vale
    expect(debtReminders([debt({ dueDate: '2026-11-28' })], now)).toHaveLength(1);
  });

  it('mensagem de cobrança e divisão da conta', () => {
    expect(debtChargeMessage(list[0]!, now)).toBe('Oi, João! Passando pra lembrar da sua parte do jantar (20 nov): R$ 60,00. Valeu! 🙂');
    expect(debtChargeMessage(debt({ person: 'Ana' }), now)).toContain('daquele valor (20 nov): R$ 50,00');
    expect(splitShare(10000, 3)).toBe(3333);
    expect(splitShare(10000, 1)).toBe(10000);
  });
});
