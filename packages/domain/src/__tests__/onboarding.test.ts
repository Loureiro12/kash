import { describe, expect, it } from 'vitest';
import { onboardingStatus, type OnboardingInput } from '../selectors/onboarding';

const empty: OnboardingInput = { accounts: [], cards: [], txs: [], bills: [], goals: [], settings: { onboardingDone: false, checklistHidden: false } };
const account = { id: 'a', name: 'Corrente', kind: 'Conta corrente', balance: 100, color: '#C6F432' };

describe('primeiro acesso', () => {
  it('conta nova: boas-vindas e card com 0 de 4 (cartão é opcional)', () => {
    const s = onboardingStatus(empty);
    expect(s.showWelcome).toBe(true);
    expect(s.showChecklist).toBe(true);
    expect([s.doneCount, s.total, s.pct, s.allDone]).toEqual([0, 4, 0, false]);
    expect(s.next?.id).toBe('account');
    expect(s.steps.map((x) => x.id)).toEqual(['account', 'expense', 'card', 'bill', 'goal']);
  });

  it('boas-vindas somem ao pular ou ao ter uma conta', () => {
    expect(onboardingStatus({ ...empty, settings: { onboardingDone: true, checklistHidden: false } }).showWelcome).toBe(false);
    expect(onboardingStatus({ ...empty, accounts: [account] }).showWelcome).toBe(false);
  });

  it('passos marcam sozinhos pelos dados; fatura e transferência não contam como gasto', () => {
    const base = { ...empty, accounts: [account] };
    const notExpense = onboardingStatus({
      ...base,
      txs: [
        { id: '1', title: 'Fatura', category: 'Fatura', amount: -300, date: '2026-10-01', sourceId: 'a' },
        { id: '2', title: 'Reserva', category: 'Transferência', amount: -50, date: '2026-10-01', sourceId: 'a', transferId: 't' },
      ],
    });
    expect(notExpense.steps.find((x) => x.id === 'expense')?.done).toBe(false);
    expect(notExpense.next?.id).toBe('expense');
    const full = onboardingStatus({
      ...base,
      txs: [{ id: '3', title: 'Almoço', category: 'Comida', amount: -30, date: '2026-10-01', sourceId: 'a' }],
      bills: [{ id: 'b', name: 'Internet', amount: 99, dueDay: 10, paid: false, category: 'Assinaturas' }],
      goals: [{ id: 'g', name: 'Viagem', target: 1000, saved: 0, color: '#6BC5FF', monthly: 100 }],
    });
    expect([full.doneCount, full.allDone, full.next]).toEqual([4, true, null]);
    expect(full.steps.find((x) => x.id === 'card')?.done).toBe(false);
  });

  it('card escondido não aparece', () => {
    expect(onboardingStatus({ ...empty, settings: { onboardingDone: true, checklistHidden: true } }).showChecklist).toBe(false);
  });
});
