import { act, fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import { Alert, Share } from 'react-native';
import * as api from '@kash/supabase-client';
import type { Debt } from '@kash/domain';
import { __resetRemoteActionsForTests, installRemoteActions } from '@/data/remoteActions';
import { AccountsScreen } from '@/features/accounts/AccountsScreen';
import { DebtSheet } from '@/features/debts/DebtSheet';
import { TransactionSheet } from '@/features/transactions/TransactionSheet';
import { setClock } from '@/lib/clock';
import { useKashStore } from '@/store';
import { typeAmount } from '@/test/amount';
import { renderWithTheme } from '@/test/render';

jest.mock('@/data/source', () => ({ DATA_SOURCE: 'remote' }));
const mocked = api as jest.Mocked<typeof api>;

const debt = (p: Partial<Debt>): Debt => ({ id: 'd1', person: 'Ana', description: 'cinema', amount: 40, kind: 'lent', date: '2026-11-20', dueDate: '2026-11-25', settledAt: null, ...p });
const answerAlert = (label: string) =>
  jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
    buttons?.find((b) => b.text === label)?.onPress?.();
  });

beforeEach(() => {
  setClock(new Date(2026, 10, 28, 10));
  __resetRemoteActionsForTests();
  useKashStore.getState().reset();
  useKashStore.setState((s) => ({ auth: 'app', userId: 'u-1', debts: [debt({})], ui: { ...s.ui, accountsSegment: 'debts', dataStatus: 'ready' } }));
  jest.restoreAllMocks();
  jest.clearAllMocks();
});
afterAll(() => setClock(null));

const press = (id: string) => fireEvent.press(screen.getByTestId(id));

describe('Quem me deve', () => {
  it('lista com total e atrasados; "Cobrar" abre o compartilhar com a mensagem pronta', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as never);
    await renderWithTheme(<AccountsScreen />);
    expect(screen.getByTestId('debts-total')).toHaveTextContent('R$ 40,00');
    expect(screen.getByTestId('debts-overdue')).toHaveTextContent('1');
    expect(screen.getByTestId('debt-d1-status')).toHaveTextContent('cinema · empréstimo · atrasado desde 25 nov');
    await press('debt-d1-charge');
    expect(share).toHaveBeenCalledWith({ message: expect.stringContaining('Oi, Ana! Passando pra lembrar daquele valor do cinema') });
  });

  it('"Recebi" lança a entrada na conta escolhida (e no servidor); desfazer volta', async () => {
    installRemoteActions();
    const before = useKashStore.getState().accounts[0]!;
    answerAlert(`Entrou em ${before.name}`);
    await renderWithTheme(<AccountsScreen />);
    await press('debt-d1-settle');
    const s = useKashStore.getState();
    expect(s.debts[0]).toMatchObject({ settledAt: '2026-11-28' });
    expect(s.txs[0]).toMatchObject({ title: 'Ana pagou: cinema', category: 'Entrada', amount: 40 });
    expect(s.accounts[0]!.balance).toBeCloseTo(before.balance + 40);
    await act(async () => {});
    expect(mocked.settleDebt).toHaveBeenCalledWith(expect.anything(), 'd1', before.id);

    await act(() => useKashStore.getState().unsettleDebt('d1'));
    expect(useKashStore.getState().debts[0]!.settledAt).toBeNull();
    expect(useKashStore.getState().accounts[0]!.balance).toBeCloseTo(before.balance);
  });

  it('anotar: quem, quanto, lembrete; vai para o servidor', async () => {
    installRemoteActions();
    useKashStore.setState({ debts: [] });
    await act(() => useKashStore.getState().openSheet('debt'));
    await renderWithTheme(<DebtSheet />);
    await typeAmount('debt-amount', ['150', '00']);
    await fireEvent.changeText(screen.getByTestId('debt-person'), 'Bruno');
    await fireEvent.changeText(screen.getByTestId('debt-description'), 'aluguel do carro');
    await press('debt-save');
    expect(useKashStore.getState().debts[0]).toMatchObject({ person: 'Bruno', amount: 150, kind: 'lent', dueDate: '2026-12-05', settledAt: null });
    await act(async () => {});
    expect(mocked.createDebt).toHaveBeenCalledWith(expect.anything(), { person: 'Bruno', description: 'aluguel do carro', amount: 150, kind: 'lent', date: '2026-11-28', dueDate: '2026-12-05' });
  });

  it('"Dividir com amigos" a partir de um lançamento: parte de cada um pelo número de pessoas', async () => {
    useKashStore.setState({ debts: [] });
    await act(() => useKashStore.getState().openTransaction('tx1'));
    await renderWithTheme(<TransactionSheet />);
    await press('expense-split');
    expect(useKashStore.getState().ui).toMatchObject({ sheet: 'debt', debtDraft: { description: 'Almoço no RU', totalCents: 1450 } });
    await renderWithTheme(<DebtSheet />);
    expect(screen.getByTestId('debt-amount')).toHaveTextContent('R$ 7,25');
    await press('debt-people-inc');
    expect(screen.getByTestId('debt-amount')).toHaveTextContent('R$ 4,83');
    expect(screen.getByTestId('debt-kind-split')).toBeSelected();
  });
});
