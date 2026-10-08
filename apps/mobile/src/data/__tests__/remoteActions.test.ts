import { act } from '@testing-library/react-native';
import * as api from '@kash/supabase-client';
import { queryClient } from '@/data/queryClient';
import { __resetRemoteActionsForTests, installRemoteActions, splitAccountKind } from '@/data/remoteActions';
import { setClock } from '@/lib/clock';
import { useKashStore } from '@/store';

jest.mock('@/data/source', () => ({ DATA_SOURCE: 'remote' }));

const mocked = api as jest.Mocked<typeof api>;
// deixa a cadeia task → onSuccess → invalidate terminar
const flush = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });

beforeEach(() => {
  setClock(new Date(2026, 9, 15, 10));
  useKashStore.getState().reset();
  __resetRemoteActionsForTests();
  jest.clearAllMocks();
  installRemoteActions();
});
afterAll(() => setClock(null));

describe('ações remotas', () => {
  it('gasto à vista: atualiza local e cria no servidor, depois refaz o snapshot', async () => {
    useKashStore.getState().addTransaction({ kind: 'expense', amountCents: 1450, category: 'Comida', sourceId: 'acc1', note: 'Lanche', installments: 1 });
    expect(useKashStore.getState().txs[0]).toMatchObject({ title: 'Lanche', amount: -14.5 });
    await flush();
    expect(mocked.createTransaction).toHaveBeenCalledWith(expect.anything(), { title: 'Lanche', category: 'Comida', amount: 14.5, date: expect.any(String), sourceType: 'account', sourceId: 'acc1' });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['snapshot'] });
  });
  it('parcelado no cartão usa a RPC de parcelamento', async () => {
    useKashStore.getState().addTransaction({ kind: 'expense', amountCents: 120000, category: 'Outros', sourceId: 'card1', note: 'Notebook', installments: 6 });
    await flush();
    expect(mocked.addInstallmentPurchase).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ title: 'Notebook', cardId: 'card1', total: 1200, installments: 6 }));
    expect(mocked.createTransaction).not.toHaveBeenCalled();
  });
  it('parcelado com a 1ª parcela no passado manda a parcela do mês e a data dela', async () => {
    // relógio em 15 out 2026; 1ª parcela em fev/26 → 9ª agora, datada no próprio mês
    useKashStore.getState().addTransaction({ kind: 'expense', amountCents: 120000, category: 'Outros', sourceId: 'card1', note: 'Celular', installments: 12, firstInstallmentMonth: '2026-02', date: '2026-09-20' });
    await flush();
    expect(mocked.addInstallmentPurchase).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ title: 'Celular', total: 1200, installments: 12, current: 9, date: '2026-10-01' }));
  });
  it('parcelado já quitado não chama o servidor', async () => {
    useKashStore.getState().addTransaction({ kind: 'expense', amountCents: 30000, category: 'Outros', sourceId: 'card1', note: 'Fone', installments: 3, firstInstallmentMonth: '2026-01' });
    await flush();
    expect(mocked.addInstallmentPurchase).not.toHaveBeenCalled();
  });
  it('entrada vai como Entrada numa conta', async () => {
    useKashStore.getState().addTransaction({ kind: 'income', amountCents: 50000, category: 'Outros', sourceId: 'acc1', note: '', installments: 1 });
    await flush();
    expect(mocked.createTransaction).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ category: 'Entrada', amount: 500, sourceType: 'account' }));
  });
  it('erro no servidor mostra toast e refaz o snapshot (rollback)', async () => {
    mocked.createTransaction.mockRejectedValueOnce(new api.KashApiError('network', 'Sem conexão.'));
    useKashStore.getState().addTransaction({ kind: 'expense', amountCents: 100, category: 'Comida', sourceId: 'acc1', note: '', installments: 1 });
    await flush();
    expect(useKashStore.getState().ui.toast).toBe('Sem conexão.');
    expect(queryClient.invalidateQueries).toHaveBeenCalled();
  });
  it('excluir guarda o grupo e desfazer usa a RPC', async () => {
    mocked.softDeleteTransaction.mockResolvedValueOnce('grp-1');
    useKashStore.getState().deleteTransaction('tx1');
    await flush();
    expect(mocked.softDeleteTransaction).toHaveBeenCalledWith(expect.anything(), 'tx1', 'single');
    useKashStore.getState().undoDelete();
    await flush();
    expect(mocked.undoDeleteTransaction).toHaveBeenCalledWith(expect.anything(), 'grp-1');
  });
  it('pagar/desmarcar conta fixa escolhe a RPC pelo estado anterior', async () => {
    useKashStore.getState().toggleBillPaid('bill2');
    await flush();
    expect(mocked.payBill).toHaveBeenCalledWith(expect.anything(), 'bill2');
    useKashStore.getState().toggleBillPaid('bill2');
    await flush();
    expect(mocked.unpayBill).toHaveBeenCalledWith(expect.anything(), 'bill2');
  });
  it('novo cartão seleciona o id do servidor; conta fixa no cartão manda a origem certa', async () => {
    mocked.createCard.mockResolvedValueOnce({ id: 'srv-card' } as never);
    useKashStore.getState().addCard({ name: 'Novo', last4: '1111', limit: 500, closingDay: null, dueDay: null, gradientId: 'blue' });
    await flush();
    expect(mocked.createCard).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ closingDay: 1, dueDay: 10 }));
    expect(useKashStore.getState().ui.selectedCardId).toBe('srv-card');
    useKashStore.getState().addBill({ name: 'Spotify', amount: 21.9, dueDay: 8, category: 'Assinaturas', sourceId: 'card1' });
    await flush();
    expect(mocked.createBill).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ source: { type: 'card', id: 'card1' } }));
  });
  it('preferências e perfil persistem; virada de mês vira RPC sem rodar localmente', async () => {
    useKashStore.getState().toggleTheme();
    useKashStore.getState().setMonthlyBudget(2000);
    useKashStore.getState().updateUser({ name: 'Lara M.' });
    await flush();
    expect(mocked.updateSettings).toHaveBeenCalledWith(expect.anything(), { theme: 'light' });
    expect(mocked.updateSettings).toHaveBeenCalledWith(expect.anything(), { monthlyBudget: 2000 });
    expect(mocked.updateUser).toHaveBeenCalledWith(expect.anything(), { name: 'Lara M.', phone: undefined });
    useKashStore.getState().rolloverIfNeeded();
    await flush();
    expect(mocked.ensureRollover).toHaveBeenCalled();
  });
  it('splitAccountKind separa tipo e instituição', () => {
    expect(splitAccountKind('Poupança · Banco X')).toEqual({ kind: 'Poupança', institution: 'Banco X' });
    expect(splitAccountKind('Dinheiro')).toEqual({ kind: 'Conta corrente', institution: '' });
  });
});
