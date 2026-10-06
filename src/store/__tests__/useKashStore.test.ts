import { act } from '@testing-library/react-native';
import { setClock } from '@/lib/clock';
import { useKashStore } from '../useKashStore';

const now = new Date(2026, 9, 15, 10);

beforeEach(() => {
  setClock(now);
  useKashStore.getState().reset();
});

afterAll(() => setClock(null));

describe('fluxo de auth', () => {
  it('onboarding → login → app → logout → login', () => {
    const s = useKashStore.getState();
    expect(s.auth).toBe('onboarding');
    act(() => s.start());
    expect(useKashStore.getState().auth).toBe('login');
    act(() => s.login());
    expect(useKashStore.getState().auth).toBe('app');
    act(() => s.logout());
    expect(useKashStore.getState().auth).toBe('login');
  });
  it('excluir conta volta ao onboarding, zera dados e mostra toast', () => {
    const s = useKashStore.getState();
    act(() => {
      s.login();
      s.contributeToGoal('goal1', 50);
      s.deleteAccount();
    });
    const after = useKashStore.getState();
    expect(after.auth).toBe('onboarding');
    expect(after.goals[0]?.saved).toBe(1240);
    expect(after.ui.toast).toBe('Conta excluída');
  });
});

describe('addExpense', () => {
  it('à vista numa conta debita o saldo', () => {
    act(() => useKashStore.getState().addExpense({ amountCents: 1450, category: 'Comida', sourceId: 'acc1', note: 'Lanche', installments: 1 }));
    const s = useKashStore.getState();
    expect(s.txs[0]).toMatchObject({ title: 'Lanche', amount: -14.5, sourceId: 'acc1', date: '2026-10-15' });
    expect(s.accounts[0]?.balance).toBe(2326);
    expect(s.ui.sheet).toBeNull();
  });
  it('sem descrição usa a categoria como título', () => {
    act(() => useKashStore.getState().addExpense({ amountCents: 500, category: 'Lazer', sourceId: 'acc1', note: '  ', installments: 1 }));
    expect(useKashStore.getState().txs[0]?.title).toBe('Lazer');
  });
  it('parcelado no cartão cria plano e primeira parcela', () => {
    act(() => useKashStore.getState().addExpense({ amountCents: 120000, category: 'Outros', sourceId: 'card1', note: 'Notebook', installments: 6 }));
    const s = useKashStore.getState();
    expect(s.txs[0]).toMatchObject({ title: 'Notebook (1/6)', amount: -200, sourceId: 'card1' });
    expect(s.plans.at(-1)).toMatchObject({ title: 'Notebook', installments: 6, current: 1, perInstallment: 200 });
    expect(s.accounts[0]?.balance).toBe(2340.5);
  });
  it('conta nunca parcela', () => {
    act(() => useKashStore.getState().addExpense({ amountCents: 10000, category: 'Outros', sourceId: 'acc2', note: '', installments: 4 }));
    expect(useKashStore.getState().txs[0]?.title).toBe('Outros');
    expect(useKashStore.getState().plans).toHaveLength(2);
  });
  it('ignora valor zero', () => {
    const before = useKashStore.getState().txs.length;
    act(() => useKashStore.getState().addExpense({ amountCents: 0, category: 'Outros', sourceId: 'acc1', note: '', installments: 1 }));
    expect(useKashStore.getState().txs).toHaveLength(before);
  });
});

describe('cartões e contas', () => {
  it('addCard seleciona o novo cartão e fecha o sheet', () => {
    act(() => useKashStore.getState().addCard({ name: 'Cartão da facul', last4: '9999', limit: 1500, closingDay: 10, dueDay: 20, gradientId: 'blue' }));
    const s = useKashStore.getState();
    const card = s.cards.at(-1)!;
    expect(card).toMatchObject({ name: 'Cartão da facul', last4: '9999', limit: 1500, gradientId: 'blue' });
    expect(s.ui.selectedCardId).toBe(card.id);
    expect(s.ui.sheet).toBeNull();
  });
  it('addAccount monta o tipo com o banco', () => {
    act(() => useKashStore.getState().addAccount({ name: 'Estágio', kind: 'Poupança', bank: 'Banco X', balance: 300, color: '#6BC5FF' }));
    expect(useKashStore.getState().accounts.at(-1)).toMatchObject({ name: 'Estágio', kind: 'Poupança · Banco X', balance: 300 });
    act(() => useKashStore.getState().addAccount({ name: 'Cofre', kind: 'Carteira', bank: '', balance: 0, color: '#6BC5FF' }));
    expect(useKashStore.getState().accounts.at(-1)?.kind).toBe('Carteira');
  });
});

describe('contas fixas, metas, ui', () => {
  it('toggleBillPaid alterna', () => {
    act(() => useKashStore.getState().toggleBillPaid('bill2'));
    expect(useKashStore.getState().bills.find((b) => b.id === 'bill2')?.paid).toBe(true);
    act(() => useKashStore.getState().toggleBillPaid('bill2'));
    expect(useKashStore.getState().bills.find((b) => b.id === 'bill2')?.paid).toBe(false);
  });
  it('contributeToGoal respeita o alvo', () => {
    act(() => useKashStore.getState().contributeToGoal('goal2', 500));
    expect(useKashStore.getState().goals[1]?.saved).toBe(900);
  });
  it('openSheet incrementa o nonce e closeSheet limpa', () => {
    act(() => useKashStore.getState().openSheet('expense'));
    expect(useKashStore.getState().ui).toMatchObject({ sheet: 'expense', sheetNonce: 1 });
    act(() => useKashStore.getState().closeSheet());
    expect(useKashStore.getState().ui.sheet).toBeNull();
  });
  it('toast some após 2,2s', () => {
    jest.useFakeTimers();
    act(() => useKashStore.getState().showToast('Oi'));
    expect(useKashStore.getState().ui.toast).toBe('Oi');
    act(() => {
      jest.advanceTimersByTime(2300);
    });
    expect(useKashStore.getState().ui.toast).toBeNull();
    jest.useRealTimers();
  });
  it('preferências', () => {
    const s = useKashStore.getState();
    act(() => {
      s.toggleTheme();
      s.toggleHideValues();
      s.toggleBillReminder();
    });
    expect(useKashStore.getState().settings).toMatchObject({ theme: 'light', hideValues: true, billReminder: false });
  });
});
