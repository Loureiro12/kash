import { act } from '@testing-library/react-native';
import * as api from '@kash/supabase-client';
import { setClock } from '@/lib/clock';
import { useKashStore } from '../useKashStore';

const now = new Date(2026, 9, 15, 10);

beforeEach(() => {
  setClock(now);
  useKashStore.getState().reset();
});

afterAll(() => setClock(null));

const mocked = api as jest.Mocked<typeof api>;

describe('fluxo de auth (API mockada)', () => {
  it('start → login; signIn com sucesso entra; logout volta pro login', async () => {
    act(() => useKashStore.getState().start());
    expect(useKashStore.getState().auth).toBe('login');
    mocked.signIn.mockResolvedValueOnce({ user: { id: 'u-1' } } as never);
    await act(async () => {
      await useKashStore.getState().signIn({ email: 'lara@email.com', password: '123456' });
    });
    expect(useKashStore.getState().auth).toBe('app');
    await act(async () => useKashStore.getState().logout());
    expect(useKashStore.getState().auth).toBe('login');
  });
  it('signIn com erro mostra a mensagem do KashApiError', async () => {
    mocked.signIn.mockRejectedValueOnce(new api.KashApiError('invalid_credentials', 'E-mail ou senha incorretos.'));
    let ok = true;
    await act(async () => {
      ok = await useKashStore.getState().signIn({ email: 'lara@email.com', password: 'errada' });
    });
    expect(ok).toBe(false);
    expect(useKashStore.getState().authRequest).toEqual({ status: 'error', error: 'E-mail ou senha incorretos.' });
  });
  it('signUp com sessão entra com o nome; sem sessão pede confirmação de e-mail', async () => {
    mocked.signUp.mockResolvedValueOnce({ user: { id: 'u-2' } } as never);
    await act(async () => {
      await useKashStore.getState().signUp({ name: ' Ana ', email: 'ana@email.com', password: '123456' });
    });
    expect(useKashStore.getState()).toMatchObject({ auth: 'app', user: { name: 'Ana', email: 'ana@email.com' } });
    useKashStore.getState().reset();
    mocked.signUp.mockResolvedValueOnce(null);
    await act(async () => {
      await useKashStore.getState().signUp({ name: 'Bia', email: 'bia@email.com', password: '123456' });
    });
    expect(useKashStore.getState().authRequest.error).toMatch(/confirmar/);
  });
  it('requestPasswordReset sucesso e erro', async () => {
    mocked.requestPasswordReset.mockResolvedValueOnce(undefined);
    await act(async () => {
      await useKashStore.getState().requestPasswordReset('lara@email.com');
    });
    expect(useKashStore.getState().authRequest.status).toBe('success');
    mocked.requestPasswordReset.mockRejectedValueOnce(new api.KashApiError('network', 'Sem conexão.'));
    await act(async () => {
      await useKashStore.getState().requestPasswordReset('lara@email.com');
    });
    expect(useKashStore.getState().authRequest.error).toBe('Sem conexão.');
  });
  it('excluir conta chama a API, zera dados e volta ao onboarding; falha mostra toast', async () => {
    mocked.deleteOwnAccount.mockResolvedValueOnce(undefined);
    await act(async () => {
      useKashStore.getState().contributeToGoal('goal1', 50);
      await useKashStore.getState().deleteAccount();
    });
    let s = useKashStore.getState();
    expect(s.auth).toBe('onboarding');
    expect(s.goals[0]?.saved).toBe(1240);
    expect(s.ui.toast).toBe('Conta excluída');
    mocked.deleteOwnAccount.mockRejectedValueOnce(new api.KashApiError('network', 'Sem conexão.'));
    let ok = true;
    await act(async () => {
      ok = await useKashStore.getState().deleteAccount();
    });
    s = useKashStore.getState();
    expect(ok).toBe(false);
    expect(s.ui.toast).toBe('Sem conexão.');
  });
  it('bootstrapAuth sem sessão vai pro onboarding (ou login se já visto)', async () => {
    await act(async () => useKashStore.getState().bootstrapAuth());
    expect(['onboarding', 'login']).toContain(useKashStore.getState().auth);
  });
});

describe('hidratação do servidor', () => {
  it('substitui as entidades, mantém preferências locais e ajusta o cartão selecionado', () => {
    const snap = {
      user: { name: 'Lara', email: 'lara@email.com', phone: '' },
      settings: { theme: 'light' as const, hideValues: false, billReminder: true, monthlyBudget: 2500, biometrics: true, currency: 'BRL' as const },
      lastRolloverMonth: '2026-10',
      accounts: [{ id: 'u-acc', name: 'Conta', kind: 'Conta corrente', balance: 10, color: '#fff' }],
      cards: [{ id: 'u-card', name: 'Cartão', last4: '0000', limit: 100, closingDay: 1, dueDay: 10, gradientId: 'blue' as const }],
      cardUsage: { 'u-card': 5 },
      txs: [],
      plans: [],
      bills: [],
      goals: [],
      invoices: [],
      categories: [{ id: 'c-1', name: 'Pets', color: '#FF8A3D' }],
    };
    act(() => useKashStore.getState().hydrateFromServer(snap));
    expect(useKashStore.getState().categories).toEqual(snap.categories);
    const s = useKashStore.getState();
    expect(s.accounts).toEqual(snap.accounts);
    expect(s.settings.monthlyBudget).toBe(2500);
    expect(s.ui.selectedCardId).toBe('u-card');
    expect(s.txs).toEqual([]);
  });
});

describe('fatura', () => {
  it('seed tem a fatura do mês passado em aberto e rolloverIfNeeded não altera no mesmo mês', () => {
    const s = useKashStore.getState();
    expect(s.invoices[0]).toMatchObject({ cardId: 'card1', month: '2026-09', total: 1240.3, paid: false });
    act(() => useKashStore.getState().rolloverIfNeeded());
    expect(useKashStore.getState().invoices).toHaveLength(1);
  });
  it('rolloverIfNeeded processa a virada quando o mês mudou', () => {
    act(() => useKashStore.setState({ lastRolloverMonth: '2026-09', bills: useKashStore.getState().bills.map((b) => ({ ...b, paid: true })) }));
    act(() => useKashStore.getState().rolloverIfNeeded());
    const s = useKashStore.getState();
    expect(s.lastRolloverMonth).toBe('2026-10');
    expect(s.bills.every((b) => !b.paid)).toBe(true);
    expect(s.plans.find((p) => p.id === 'plan1')?.current).toBe(6);
  });
  it('payInvoice debita a conta, marca paga e não conta como gasto; excluir o pagamento reabre', () => {
    const spentBefore = useKashStore.getState().txs.filter((t) => t.amount < 0).length;
    act(() => useKashStore.getState().payInvoice('inv1', 'acc1'));
    let s = useKashStore.getState();
    expect(s.accounts[0]?.balance).toBe(1100.2);
    expect(s.invoices[0]).toMatchObject({ paid: true, paidAt: '2026-10-15' });
    expect(s.txs[0]).toMatchObject({ title: 'Fatura Cartão principal', category: 'Fatura', amount: -1240.3, sourceId: 'acc1' });
    expect(s.txs.filter((t) => t.amount < 0)).toHaveLength(spentBefore + 1);
    act(() => useKashStore.getState().payInvoice('inv1', 'acc1'));
    expect(useKashStore.getState().accounts[0]?.balance).toBe(1100.2);
    act(() => useKashStore.getState().deleteTransaction(s.txs[0]!.id));
    s = useKashStore.getState();
    expect(s.invoices[0]?.paid).toBe(false);
    expect(s.accounts[0]?.balance).toBe(2340.5);
  });
});

describe('addTransaction', () => {
  it('à vista numa conta debita o saldo', () => {
    act(() => useKashStore.getState().addTransaction({ kind: 'expense', amountCents: 1450, category: 'Comida', sourceId: 'acc1', note: 'Lanche', installments: 1 }));
    const s = useKashStore.getState();
    expect(s.txs[0]).toMatchObject({ title: 'Lanche', amount: -14.5, sourceId: 'acc1', date: '2026-10-15' });
    expect(s.accounts[0]?.balance).toBe(2326);
    expect(s.ui.sheet).toBeNull();
  });
  it('sem descrição usa a categoria como título', () => {
    act(() => useKashStore.getState().addTransaction({ kind: 'expense', amountCents: 500, category: 'Lazer', sourceId: 'acc1', note: '  ', installments: 1 }));
    expect(useKashStore.getState().txs[0]?.title).toBe('Lazer');
  });
  it('parcelado no cartão cria plano e primeira parcela', () => {
    act(() => useKashStore.getState().addTransaction({ kind: 'expense', amountCents: 120000, category: 'Outros', sourceId: 'card1', note: 'Notebook', installments: 6 }));
    const s = useKashStore.getState();
    expect(s.txs[0]).toMatchObject({ title: 'Notebook (1/6)', amount: -200, sourceId: 'card1', planId: s.plans.at(-1)?.id });
    expect(s.plans.at(-1)).toMatchObject({ title: 'Notebook', installments: 6, current: 1, perInstallment: 200 });
    expect(s.accounts[0]?.balance).toBe(2340.5);
  });
  it('conta nunca parcela', () => {
    act(() => useKashStore.getState().addTransaction({ kind: 'expense', amountCents: 10000, category: 'Outros', sourceId: 'acc2', note: '', installments: 4 }));
    expect(useKashStore.getState().txs[0]?.title).toBe('Outros');
    expect(useKashStore.getState().plans).toHaveLength(2);
  });
  it('ignora valor zero', () => {
    const before = useKashStore.getState().txs.length;
    act(() => useKashStore.getState().addTransaction({ kind: 'expense', amountCents: 0, category: 'Outros', sourceId: 'acc1', note: '', installments: 1 }));
    expect(useKashStore.getState().txs).toHaveLength(before);
  });
  it('entrada credita a conta, usa data informada e nunca vai pra cartão', () => {
    act(() => useKashStore.getState().addTransaction({ kind: 'income', amountCents: 50000, category: 'Outros', sourceId: 'acc1', note: 'Freela', installments: 3, date: '2026-10-03' }));
    let s = useKashStore.getState();
    expect(s.txs[0]).toMatchObject({ title: 'Freela', category: 'Entrada', amount: 500, date: '2026-10-03', sourceId: 'acc1' });
    expect(s.accounts[0]?.balance).toBe(2840.5);
    const before = s.txs.length;
    act(() => useKashStore.getState().addTransaction({ kind: 'income', amountCents: 1000, category: 'Outros', sourceId: 'card1', note: '', installments: 1 }));
    s = useKashStore.getState();
    expect(s.txs).toHaveLength(before);
  });
});

describe('editar e excluir lançamento', () => {
  it('updateTransaction ajusta saldos ao mudar valor e conta', () => {
    // tx1: Almoço no RU, -14.5 em acc1
    act(() => useKashStore.getState().updateTransaction('tx1', { amountCents: 2000, sourceId: 'acc3', title: 'Almoço', category: 'Mercado', date: '2026-10-10' }));
    const s = useKashStore.getState();
    expect(s.txs.find((t) => t.id === 'tx1')).toMatchObject({ title: 'Almoço', category: 'Mercado', amount: -20, sourceId: 'acc3', date: '2026-10-10' });
    expect(s.accounts[0]?.balance).toBe(2355); // devolveu 14,50
    expect(s.accounts[2]?.balance).toBe(65); // debitou 20
    expect(s.ui.sheet).toBeNull();
  });
  it('entrada editada mantém categoria Entrada e sinal positivo', () => {
    act(() => useKashStore.getState().updateTransaction('tx4', { amountCents: 70000, category: 'Lazer' }));
    const s = useKashStore.getState();
    expect(s.txs.find((t) => t.id === 'tx4')).toMatchObject({ category: 'Entrada', amount: 700 });
    expect(s.accounts[0]?.balance).toBe(2440.5);
  });
  it('deleteTransaction devolve saldo, guarda para desfazer e undo restaura', () => {
    act(() => useKashStore.getState().deleteTransaction('tx1'));
    let s = useKashStore.getState();
    expect(s.txs.find((t) => t.id === 'tx1')).toBeUndefined();
    expect(s.accounts[0]?.balance).toBe(2355);
    expect(s.ui.lastDeleted?.txs.map((t) => t.id)).toEqual(['tx1']);
    act(() => useKashStore.getState().undoDelete());
    s = useKashStore.getState();
    expect(s.txs.find((t) => t.id === 'tx1')).toBeDefined();
    expect(s.accounts[0]?.balance).toBe(2340.5);
    expect(s.ui.lastDeleted).toBeNull();
  });
  it('excluir parcela única decrementa o plano; excluir plano remove tudo', () => {
    act(() => useKashStore.getState().deleteTransaction('tx11', 'single'));
    let s = useKashStore.getState();
    expect(s.plans.find((p) => p.id === 'plan1')?.current).toBe(4);
    act(() => useKashStore.getState().undoDelete());
    expect(useKashStore.getState().plans.find((p) => p.id === 'plan1')?.current).toBe(5);
    act(() => useKashStore.getState().deleteTransaction('tx11', 'plan'));
    s = useKashStore.getState();
    expect(s.plans.find((p) => p.id === 'plan1')).toBeUndefined();
    expect(s.txs.find((t) => t.planId === 'plan1')).toBeUndefined();
  });
  it('excluir o lançamento de uma conta fixa paga desmarca a conta', () => {
    act(() => useKashStore.getState().toggleBillPaid('bill4'));
    const txId = useKashStore.getState().bills.find((b) => b.id === 'bill4')!.paidTxId!;
    act(() => useKashStore.getState().deleteTransaction(txId));
    const s = useKashStore.getState();
    expect(s.bills.find((b) => b.id === 'bill4')).toMatchObject({ paid: false });
    expect(s.accounts[0]?.balance).toBe(2340.5);
  });
  it('toast com ação dura mais e some', () => {
    jest.useFakeTimers();
    const onPress = jest.fn();
    act(() => useKashStore.getState().showToast('Excluído', { label: 'Desfazer', onPress }));
    expect(useKashStore.getState().ui.toastAction?.label).toBe('Desfazer');
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(useKashStore.getState().ui.toast).toBe('Excluído');
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(useKashStore.getState().ui.toast).toBeNull();
    jest.useRealTimers();
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

describe('editar e excluir cartão, conta, conta fixa e meta', () => {
  it('openEdit abre o sheet certo com a referência', () => {
    act(() => useKashStore.getState().openEdit({ kind: 'bill', id: 'bill2' }));
    expect(useKashStore.getState().ui).toMatchObject({ sheet: 'addBill', editing: { kind: 'bill', id: 'bill2' } });
    act(() => useKashStore.getState().openSheet('addBill'));
    expect(useKashStore.getState().ui.editing).toBeNull();
  });
  it('updateCard mantém campos inválidos e removeCard apaga lançamentos, planos e desliga contas fixas', () => {
    act(() => useKashStore.getState().updateCard('card1', { name: 'Principal', last4: '', limit: 0, closingDay: null, dueDay: 12, gradientId: 'blue' }));
    expect(useKashStore.getState().cards[0]).toMatchObject({ name: 'Principal', last4: '4821', limit: 2500, closingDay: 28, dueDay: 12, gradientId: 'blue' });
    act(() => useKashStore.getState().removeCard('card1'));
    const s = useKashStore.getState();
    expect(s.cards.map((c) => c.id)).toEqual(['card2']);
    expect(s.txs.some((t) => t.sourceId === 'card1')).toBe(false);
    expect(s.plans.some((p) => p.cardId === 'card1')).toBe(false);
    expect(s.bills.find((b) => b.id === 'bill2')?.sourceId).toBeUndefined();
    expect(s.ui.selectedCardId).toBe('card2');
  });
  it('updateAccount e removeAccount (lançamentos somem, metas e contas fixas ficam sem conta)', () => {
    act(() => useKashStore.getState().updateAccount('acc1', { name: 'Nubank', kind: 'Conta corrente', bank: 'Nu', balance: 100, color: '#6BC5FF' }));
    expect(useKashStore.getState().accounts[0]).toMatchObject({ name: 'Nubank', kind: 'Conta corrente · Nu', balance: 100, color: '#6BC5FF' });
    act(() => useKashStore.getState().removeAccount('acc2'));
    const s = useKashStore.getState();
    expect(s.accounts.map((a) => a.id)).toEqual(['acc1', 'acc3']);
    expect(s.goals.find((g) => g.id === 'goal1')?.accountId).toBeUndefined();
  });
  it('updateBill reordena por dia; removeBill mantém o pagamento já lançado', () => {
    act(() => useKashStore.getState().updateBill('bill5', { name: 'Celular', amount: 59.9, dueDay: 2, category: 'Assinaturas', sourceId: 'acc1' }));
    let s = useKashStore.getState();
    expect(s.bills[0]).toMatchObject({ id: 'bill5', name: 'Celular', amount: 59.9, dueDay: 2, sourceId: 'acc1' });
    act(() => useKashStore.getState().toggleBillPaid('bill5'));
    const txId = useKashStore.getState().bills.find((b) => b.id === 'bill5')!.paidTxId!;
    act(() => useKashStore.getState().removeBill('bill5'));
    s = useKashStore.getState();
    expect(s.bills.find((b) => b.id === 'bill5')).toBeUndefined();
    expect(s.txs.find((t) => t.id === txId)).toBeDefined();
  });
  it('updateGoal limita guardado ao alvo; removeGoal apaga só a meta', () => {
    act(() => useKashStore.getState().updateGoal('goal2', { name: 'Fone', target: 500, saved: 620, monthly: 100, color: '#fff', accountId: undefined, depositDay: 3 }));
    expect(useKashStore.getState().goals[1]).toMatchObject({ name: 'Fone', target: 500, saved: 500, depositDay: 3, accountId: undefined });
    act(() => useKashStore.getState().removeGoal('goal2'));
    expect(useKashStore.getState().goals.map((g) => g.id)).toEqual(['goal1', 'goal3']);
  });
  it('dataStatus alterna', () => {
    act(() => useKashStore.getState().setDataStatus('loading'));
    expect(useKashStore.getState().ui.dataStatus).toBe('loading');
    act(() => useKashStore.getState().setDataStatus('ready'));
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

describe('categorias no store', () => {
  beforeEach(() => useKashStore.getState().reset());

  it('cria no fim; renomear leva lançamentos, contas fixas, parcelamentos e títulos iguais ao nome', () => {
    const st = () => useKashStore.getState();
    act(() => st().addCategory({ name: ' Pets ', color: '#FF8A3D' }));
    expect(st().categories.at(-1)).toMatchObject({ name: 'Pets', color: '#FF8A3D' });
    const assin = st().categories.find((c) => c.name === 'Assinaturas')!;
    const before = st().txs.filter((t) => t.category === 'Assinaturas').length;
    act(() => st().updateCategory(assin.id, { name: 'Streaming', color: '#3D8BFF' }));
    expect(st().txs.filter((t) => t.category === 'Streaming')).toHaveLength(before);
    expect(st().txs.some((t) => t.category === 'Assinaturas')).toBe(false);
    expect(st().bills.some((b) => b.category === 'Assinaturas')).toBe(false);
    expect(st().categories.find((c) => c.id === assin.id)).toMatchObject({ name: 'Streaming', color: '#3D8BFF' });
  });

  it('excluir em uso sem destino não faz nada; com destino move e remove; nunca a última', () => {
    const st = () => useKashStore.getState();
    const comida = st().categories.find((c) => c.name === 'Comida')!;
    const used = st().txs.filter((t) => t.category === 'Comida').length;
    expect(used).toBeGreaterThan(0);
    act(() => st().removeCategory(comida.id));
    expect(st().categories.some((c) => c.id === comida.id)).toBe(true);
    const outrosBefore = st().txs.filter((t) => t.category === 'Outros').length;
    act(() => st().removeCategory(comida.id, 'Outros'));
    expect(st().categories.some((c) => c.id === comida.id)).toBe(false);
    expect(st().txs.filter((t) => t.category === 'Outros')).toHaveLength(outrosBefore + used);

    useKashStore.setState({ categories: [{ id: 'only', name: 'Única', color: '#000000' }] });
    act(() => st().removeCategory('only'));
    expect(st().categories).toHaveLength(1);
  });
});
