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
  it('pagar conta cobrada no cartão gera lançamento na fatura; desmarcar remove', () => {
    const txsBefore = useKashStore.getState().txs.length;
    act(() => useKashStore.getState().toggleBillPaid('bill2'));
    let s = useKashStore.getState();
    const bill = s.bills.find((b) => b.id === 'bill2')!;
    expect(bill.paid).toBe(true);
    expect(s.txs[0]).toMatchObject({ id: bill.paidTxId, title: 'Internet', category: 'Assinaturas', amount: -99.9, sourceId: 'card1', date: '2026-10-15' });
    expect(s.accounts[0]?.balance).toBe(2340.5);
    act(() => useKashStore.getState().toggleBillPaid('bill2'));
    s = useKashStore.getState();
    expect(s.bills.find((b) => b.id === 'bill2')).toMatchObject({ paid: false, paidTxId: undefined });
    expect(s.txs).toHaveLength(txsBefore);
  });
  it('pagar conta cobrada na conta debita o saldo; desmarcar devolve', () => {
    act(() => useKashStore.getState().toggleBillPaid('bill4'));
    expect(useKashStore.getState().accounts[0]?.balance).toBe(2250.6);
    act(() => useKashStore.getState().toggleBillPaid('bill4'));
    expect(useKashStore.getState().accounts[0]?.balance).toBe(2340.5);
  });
  it('addBill valida, ordena por dia e fecha o sheet', () => {
    act(() => useKashStore.getState().addBill({ name: ' Spotify ', amount: 21.9, dueDay: 8, category: 'Assinaturas', sourceId: 'card2' }));
    const s = useKashStore.getState();
    expect(s.bills.map((b) => b.dueDay)).toEqual([5, 8, 10, 12, 15, 20]);
    expect(s.bills.find((b) => b.name === 'Spotify')).toMatchObject({ amount: 21.9, paid: false, sourceId: 'card2' });
    expect(s.ui.sheet).toBeNull();
    act(() => useKashStore.getState().addBill({ name: 'x', amount: 10, dueDay: 40, category: 'Outros' }));
    expect(useKashStore.getState().bills).toHaveLength(6);
  });
  it('addGoal cria meta com valores saneados e fecha o sheet', () => {
    act(() => useKashStore.getState().addGoal({ name: '  Notebook ', target: 4000, saved: 5000, monthly: 400, color: '#6BC5FF' }));
    const s = useKashStore.getState();
    expect(s.goals.at(-1)).toMatchObject({ name: 'Notebook', target: 4000, saved: 4000, monthly: 400, color: '#6BC5FF' });
    expect(s.ui.sheet).toBeNull();
  });
  it('addGoal ignora nome vazio ou alvo zero', () => {
    const before = useKashStore.getState().goals.length;
    act(() => {
      useKashStore.getState().addGoal({ name: '', target: 100, saved: 0, monthly: 0, color: '#fff' });
      useKashStore.getState().addGoal({ name: 'X', target: 0, saved: 0, monthly: 0, color: '#fff' });
    });
    expect(useKashStore.getState().goals).toHaveLength(before);
  });
  it('recordDeposit atualiza meta, conta e fecha o sheet', () => {
    act(() => {
      useKashStore.getState().openDeposit('goal3');
      useKashStore.getState().recordDeposit({ goalId: 'goal3', amountCents: 25000, accountId: 'acc1' });
    });
    const s = useKashStore.getState();
    expect(s.goals[2]).toMatchObject({ saved: 2350, lastDepositDate: '2026-10-15', accountId: 'acc1' });
    expect(s.ui.sheet).toBeNull();
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
  it('updateUser ignora nome/e-mail vazios e normaliza espaços', () => {
    act(() => useKashStore.getState().updateUser({ name: '  Lara M. ', email: '', phone: ' 11 9 ' }));
    expect(useKashStore.getState().user).toEqual({ name: 'Lara M.', email: 'lara.mendes@email.com', phone: '11 9' });
  });
  it('setMonthlyBudget aceita só valores positivos', () => {
    act(() => useKashStore.getState().setMonthlyBudget(2000));
    expect(useKashStore.getState().settings.monthlyBudget).toBe(2000);
    act(() => useKashStore.getState().setMonthlyBudget(0));
    expect(useKashStore.getState().settings.monthlyBudget).toBe(2000);
  });
  it('preferências', () => {
    const s = useKashStore.getState();
    act(() => {
      s.toggleTheme();
      s.toggleHideValues();
      s.toggleBillReminder();
      s.toggleBiometrics();
    });
    expect(useKashStore.getState().settings).toMatchObject({ theme: 'light', hideValues: true, billReminder: false, biometrics: false });
  });
});
