import { act, fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import { ExpenseSheet } from '@/features/transactions/ExpenseSheet';
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

describe('ExpenseSheet', () => {
  it('digita valor, parcela no cartão e salva', async () => {
    await renderWithTheme(<ExpenseSheet />);
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
    await renderWithTheme(<ExpenseSheet />);
    await press('chip-src-acc1');
    expect(screen.queryByTestId('expense-installments')).toBeNull();
    await press('key-5');
    await press('key-00');
    await press('expense-save');
    expect(useKashStore.getState().accounts[0]?.balance).toBe(2335.5);
    expect(useKashStore.getState().ui.toast).toBe('R$ 5,00 lançado em Comida');
  });
});
