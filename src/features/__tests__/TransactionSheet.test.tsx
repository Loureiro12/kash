import { act, fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import { TransactionSheet } from '@/features/transactions/TransactionSheet';
import { setClock } from '@/lib/clock';
import { useKashStore } from '@/store';
import { renderWithTheme } from '@/test/render';

beforeEach(async () => {
  setClock(new Date(2026, 9, 15, 10));
  useKashStore.getState().reset();
  await act(async () => useKashStore.getState().openSheet('expense'));
});

afterEach(() => useKashStore.getState().hideToast());
afterAll(() => setClock(null));

const press = (id: string) => fireEvent.press(screen.getByTestId(id));

describe('TransactionSheet', () => {
  it('digita valor, parcela no cartão e salva', async () => {
    await renderWithTheme(<TransactionSheet />);
    expect(screen.getByTestId('expense-amount')).toHaveTextContent('R$ 0,00');
    expect(screen.getByTestId('expense-save')).toBeDisabled();

    for (const k of ['1', '2', '0', '0', '0', '0']) await press(`key-${k}`);
    expect(screen.getByTestId('expense-amount')).toHaveTextContent('R$ 1.200,00');

    // origem padrão é o primeiro cartão → linha de parcelamento visível
    expect(screen.getByTestId('expense-installments-label')).toHaveTextContent('À vista');
    await press('expense-inst-inc');
    await press('expense-inst-inc');
    expect(screen.getByTestId('expense-installments-label')).toHaveTextContent('3x de R$ 400,00');

    await press('chip-cat-Lazer');
    await fireEvent.changeText(screen.getByTestId('expense-note'), 'Show');
    await press('expense-save');

    const s = useKashStore.getState();
    expect(s.txs[0]).toMatchObject({ title: 'Show (1/3)', category: 'Lazer', amount: -400, sourceId: 'card1' });
    expect(s.ui.toast).toBe('3x de R$ 400,00 no cartão');
    expect(s.ui.sheet).toBeNull();
  });

  it('em conta não mostra parcelamento e debita saldo', async () => {
    await renderWithTheme(<TransactionSheet />);
    await press('chip-src-acc1');
    expect(screen.queryByTestId('expense-installments')).toBeNull();
    await press('key-5');
    await press('key-00');
    await press('expense-save');
    expect(useKashStore.getState().accounts[0]?.balance).toBe(2335.5);
    expect(useKashStore.getState().ui.toast).toBe('R$ 5,00 lançado em Comida');
  });

  it('entrada: só contas, sem categorias, credita saldo', async () => {
    await renderWithTheme(<TransactionSheet />);
    await press('tx-kind-income');
    expect(screen.queryByTestId('chip-cat-Comida')).toBeNull();
    expect(screen.queryByTestId('chip-src-card1')).toBeNull();
    await press('key-1');
    await press('key-00');
    await press('key-00');
    await fireEvent.changeText(screen.getByTestId('expense-note'), 'Mesada');
    await press('expense-save');
    const s = useKashStore.getState();
    expect(s.txs[0]).toMatchObject({ title: 'Mesada', category: 'Entrada', amount: 100, sourceId: 'acc1' });
    expect(s.accounts[0]?.balance).toBe(2440.5);
  });

  it('data: volta um dia e o atalho Hoje retorna', async () => {
    await renderWithTheme(<TransactionSheet />);
    expect(screen.getByTestId('expense-date-label')).toHaveTextContent('Hoje');
    await press('expense-date-prev');
    expect(screen.getByTestId('expense-date-label')).toHaveTextContent('Ontem');
    await press('expense-date-next');
    expect(screen.getByTestId('expense-date-label')).toHaveTextContent('Hoje');
  });

  it('edição: pré-preenche, salva alterações e exclui com desfazer', async () => {
    await act(async () => useKashStore.getState().openTransaction('tx1'));
    await renderWithTheme(<TransactionSheet />);
    expect(screen.getByTestId('expense-amount')).toHaveTextContent('R$ 14,50');
    expect(screen.getByTestId('expense-note').props.value).toBe('Almoço no RU');
    expect(screen.queryByTestId('tx-kind-income')).toBeNull();
    await press('key-0');
    await press('expense-save');
    expect(useKashStore.getState().txs.find((t) => t.id === 'tx1')?.amount).toBe(-145);
    expect(useKashStore.getState().ui.toast).toBe('Lançamento atualizado');
  });
});
