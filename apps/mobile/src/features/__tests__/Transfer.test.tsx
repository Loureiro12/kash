import { act, fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import * as api from '@kash/supabase-client';
import { __resetRemoteActionsForTests, installRemoteActions } from '@/data/remoteActions';
import { TransferSheet } from '@/features/transactions/TransferSheet';
import { setClock } from '@/lib/clock';
import { useKashStore } from '@/store';
import { renderWithTheme } from '@/test/render';

jest.mock('@/data/source', () => ({ DATA_SOURCE: 'remote' }));
const mocked = api as jest.Mocked<typeof api>;

const balance = (id: string) => useKashStore.getState().accounts.find((a) => a.id === id)!.balance;
const legs = () => useKashStore.getState().txs.filter((t) => t.transferId);

beforeEach(() => {
  setClock(new Date(2026, 9, 15, 10));
  __resetRemoteActionsForTests();
  useKashStore.getState().reset();
  useKashStore.setState({ auth: 'app', userId: 'u-1' });
  jest.clearAllMocks();
});
afterAll(() => setClock(null));

describe('transferência entre contas (store)', () => {
  it('cria as duas pernas e move o saldo, sem mexer no total', () => {
    const total = useKashStore.getState().accounts.reduce((a, x) => a + x.balance, 0);
    useKashStore.getState().addTransfer({ fromAccountId: 'acc1', toAccountId: 'acc2', amountCents: 20000, note: 'Reserva' });
    expect(balance('acc1')).toBe(2140.5);
    expect(balance('acc2')).toBe(2000);
    expect(useKashStore.getState().accounts.reduce((a, x) => a + x.balance, 0)).toBeCloseTo(total);
    expect(legs().map((t) => [t.category, t.amount, t.title])).toEqual([
      ['Transferência', -200, 'Reserva'],
      ['Transferência', 200, 'Reserva'],
    ]);
  });

  it('editar desfaz a antiga e aplica a nova; excluir leva as duas; desfazer volta', () => {
    useKashStore.getState().addTransfer({ fromAccountId: 'acc1', toAccountId: 'acc2', amountCents: 20000, note: '' });
    const id = legs()[0]!.transferId!;
    useKashStore.getState().updateTransfer(id, { fromAccountId: 'acc3', toAccountId: 'acc2', amountCents: 5000, note: '' });
    expect(balance('acc1')).toBe(2340.5);
    expect(balance('acc3')).toBe(35);
    expect(balance('acc2')).toBe(1850);
    useKashStore.getState().deleteTransaction(legs()[1]!.id);
    expect(legs()).toEqual([]);
    expect(balance('acc2')).toBe(1800);
    useKashStore.getState().undoDelete();
    expect(legs()).toHaveLength(2);
    expect(balance('acc2')).toBe(1850);
  });

  it('tocar numa perna abre o sheet de transferência', () => {
    useKashStore.getState().addTransfer({ fromAccountId: 'acc1', toAccountId: 'acc2', amountCents: 1000, note: '' });
    const leg = legs()[1]!;
    useKashStore.getState().openTransaction(leg.id);
    expect(useKashStore.getState().ui).toMatchObject({ sheet: 'transfer', transferId: leg.transferId });
  });

  it('não transfere para a mesma conta nem valor zero', () => {
    useKashStore.getState().addTransfer({ fromAccountId: 'acc1', toAccountId: 'acc1', amountCents: 1000, note: '' });
    useKashStore.getState().addTransfer({ fromAccountId: 'acc1', toAccountId: 'acc2', amountCents: 0, note: '' });
    expect(legs()).toEqual([]);
  });

  it('vai para o servidor pela RPC (criar e editar)', async () => {
    installRemoteActions();
    mocked.createTransfer.mockResolvedValueOnce('srv-tr');
    useKashStore.getState().addTransfer({ fromAccountId: 'acc1', toAccountId: 'acc2', amountCents: 12345, date: '2026-10-14', note: 'Reserva' });
    await act(async () => {});
    expect(mocked.createTransfer).toHaveBeenCalledWith(expect.anything(), { fromAccountId: 'acc1', toAccountId: 'acc2', amount: 123.45, date: '2026-10-14', title: 'Reserva' });
    const id = legs()[0]!.transferId!;
    useKashStore.getState().updateTransfer(id, { fromAccountId: 'acc1', toAccountId: 'acc3', amountCents: 1000, note: '' });
    await act(async () => {});
    expect(mocked.updateTransfer).toHaveBeenCalledWith(expect.anything(), id, { fromAccountId: 'acc1', toAccountId: 'acc3', amount: 10, date: '2026-10-14', title: '' });
  });
});

describe('sheet de transferência', () => {
  it('digita o valor, mostra os saldos depois e salva', async () => {
    useKashStore.getState().openTransfer();
    await renderWithTheme(<TransferSheet />);
    expect(screen.getByTestId('transfer-save')).toBeDisabled();
    for (const k of ['5', '00', '00']) await fireEvent.press(screen.getByTestId(`key-${k}`));
    expect(screen.getByTestId('transfer-amount')).toHaveTextContent('R$ 500,00');
    expect(screen.getByTestId('transfer-preview')).toHaveTextContent('Conta corrente fica com R$ 1.840,50 · Poupança fica com R$ 2.300,00.');
    await fireEvent.press(screen.getByTestId('transfer-to-acc3'));
    await fireEvent.press(screen.getByTestId('transfer-save'));
    expect(balance('acc3')).toBe(585);
    expect(useKashStore.getState().ui.toast).toBe('R$ 500,00 transferidos');
  });
});
