import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import * as api from '@kash/supabase-client';
import type { Tx } from '@kash/domain';
import { __resetRemoteActionsForTests, installRemoteActions } from '@/data/remoteActions';
import { AccountsScreen } from '@/features/accounts/AccountsScreen';
import { useDismissedRecurring } from '@/features/accounts/RecurringSuggestions';
import { setClock } from '@/lib/clock';
import { useKashStore } from '@/store';
import { renderWithTheme } from '@/test/render';

jest.mock('@/data/source', () => ({ DATA_SOURCE: 'remote' }));
const mocked = api as jest.Mocked<typeof api>;

const tx = (id: string, title: string, date: string, amount: number, sourceId = 'card1'): Tx => ({ id, title, category: 'Assinaturas', amount: -amount, date, sourceId, sourceType: sourceId.startsWith('card') ? 'card' : 'account' });
// Netflix todo dia 12 (inclusive este mês) e Academia todo dia 5 (este mês ainda não cobrou)
const history = [
  tx('n1', 'Netflix', '2026-08-12', 39.9), tx('n2', 'Netflix', '2026-09-12', 39.9), tx('n3', 'Netflix', '2026-10-12', 39.9), tx('n4', 'Netflix', '2026-11-12', 44.9),
  tx('a1', 'Academia Fit', '2026-08-05', 99, 'acc1'), tx('a2', 'Academia Fit', '2026-09-05', 99, 'acc1'), tx('a3', 'Academia Fit', '2026-10-05', 99, 'acc1'),
];

beforeEach(async () => {
  setClock(new Date(2026, 10, 25, 10));
  __resetRemoteActionsForTests();
  await AsyncStorage.clear();
  useDismissedRecurring.setState({ userId: null, keys: new Set() });
  useKashStore.getState().reset();
  useKashStore.setState((s) => ({ auth: 'app', userId: 'u-1', txs: history, bills: [], ui: { ...s.ui, accountsSegment: 'bills', dataStatus: 'ready' } }));
  jest.clearAllMocks();
});
afterAll(() => setClock(null));

const press = (id: string) => fireEvent.press(screen.getByTestId(id));
const flush = () => act(async () => {});

describe('Assinaturas detectadas (Contas › Fixas)', () => {
  it('lista as cobranças que se repetem, com o aumento de preço e o custo no ano', async () => {
    await renderWithTheme(<AccountsScreen />);
    await flush();
    expect(screen.getByTestId('recurring-title')).toHaveTextContent('Encontramos 2 cobranças que se repetem');
    expect(screen.getByTestId('recurring-netflix-raised')).toHaveTextContent('Subiu de R$ 39,90 para R$ 44,90');
    expect(screen.getByTestId('recurring-academia-fit-details')).toHaveTextContent('Todo dia 5 · 3 meses seguidos · R$ 1.188,00 por ano');
  });

  it('virar conta fixa: com a cobrança do mês lançada, nasce paga e ligada a ela (sem lançamento novo); no servidor, cria e liga', async () => {
    installRemoteActions();
    mocked.createBill.mockResolvedValueOnce({ id: 'srv-bill', name: 'Netflix', amount: 44.9, dueDay: 12, paid: false, category: 'Assinaturas' });
    await renderWithTheme(<AccountsScreen />);
    await flush();
    await press('recurring-netflix-add');
    await flush();
    const bill = useKashStore.getState().bills.find((b) => b.name === 'Netflix')!;
    expect(bill).toMatchObject({ amount: 44.9, dueDay: 12, paid: true, paidTxId: 'n4', paidTxLinked: true, sourceId: 'card1' });
    expect(useKashStore.getState().txs).toHaveLength(history.length);
    expect(useKashStore.getState().ui.toast).toBe('Netflix virou conta fixa (já paga este mês)');
    expect(mocked.linkBillPayment).toHaveBeenCalledWith(expect.anything(), 'srv-bill', 'n4');
    // sai das sugestões
    expect(screen.queryByTestId('recurring-netflix')).toBeNull();

    // desmarcar uma conta ligada não apaga a cobrança real
    await act(() => useKashStore.getState().toggleBillPaid(bill.id));
    expect(useKashStore.getState().txs.some((t) => t.id === 'n4')).toBe(true);
    expect(useKashStore.getState().bills.find((b) => b.id === bill.id)).toMatchObject({ paid: false });
  });

  it('sem cobrança neste mês: vira conta a pagar, com lembrete', async () => {
    await renderWithTheme(<AccountsScreen />);
    await flush();
    await press('recurring-academia-fit-add');
    expect(useKashStore.getState().bills.find((b) => b.name === 'Academia Fit')).toMatchObject({ paid: false, dueDay: 5, sourceId: 'acc1' });
    expect(useKashStore.getState().ui.toast).toBe('Academia Fit virou conta fixa: lembrete antes do dia 5');
  });

  it('ignorar some de vez (guardado neste aparelho)', async () => {
    await renderWithTheme(<AccountsScreen />);
    await flush();
    await press('recurring-academia-fit-ignore');
    expect(screen.queryByTestId('recurring-academia-fit')).toBeNull();
    expect(JSON.parse((await AsyncStorage.getItem('kash.recurring.dismissed.u-1'))!)).toEqual(['academia fit']);
  });
});
