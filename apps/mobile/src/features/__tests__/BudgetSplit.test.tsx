import { fireEvent, renderHook, screen } from '@testing-library/react-native';
import React from 'react';
import { BudgetScreen } from '@/features/profile/budget/BudgetScreen';
import { setClock } from '@/lib/clock';
import { useHomeSummary, useKashStore } from '@/store';
import { renderWithTheme } from '@/test/render';

const today = new Date(2026, 9, 15, 12);

beforeEach(() => {
  setClock(today);
  useKashStore.getState().reset();
  const s = useKashStore.getState();
  const card = s.cards[0]!;
  const account = s.accounts[0]!;
  useKashStore.setState({
    auth: 'app',
    userId: 'u-1',
    settings: { ...s.settings, monthlyBudget: 2000, cardBudget: 0 },
    txs: [
      { id: 't1', title: 'Mercado', category: 'Mercado', amount: -300, date: '2026-10-05', sourceId: card.id },
      { id: 't2', title: 'Padaria', category: 'Comida', amount: -80, date: '2026-10-06', sourceId: account.id },
      { id: 't3', title: 'Fatura', category: 'Fatura', amount: -900, date: '2026-10-07', sourceId: account.id },
    ],
  });
});
afterEach(() => setClock(null));

const press = (id: string) => fireEvent.press(screen.getByTestId(id));
const type = async (digits: string) => {
  for (const d of digits) await press(`key-${d}`);
};
const erase = async (n: number) => {
  for (let i = 0; i < n; i++) await press('key-del');
};

describe('Limite mensal dividido entre cartão e restante', () => {
  it('sem divisão: um total só, como antes', async () => {
    await renderWithTheme(<BudgetScreen />);
    expect(screen.getByTestId('budget-amount')).toHaveTextContent('R$ 2.000,00');
    expect(screen.getByTestId('budget-preview-total')).toHaveTextContent(/R\$ 380,00/);
  });

  it('dividir começa com tudo no restante; o total é a soma e o pagamento da fatura não conta', async () => {
    await renderWithTheme(<BudgetScreen />);
    await press('budget-split-switch');
    expect(screen.getByTestId('budget-rest-amount')).toHaveTextContent('R$ 2.000,00');
    expect(screen.getByTestId('budget-card-amount')).toHaveTextContent('R$ 0,00');
    // sem valor no cartão não salva
    expect(screen.getByTestId('budget-save')).toBeDisabled();

    await type('150000'); // cartão: R$ 1.500,00
    await press('budget-field-rest');
    await erase(6);
    await type('50000'); // restante: R$ 500,00
    expect(screen.getByTestId('budget-total')).toHaveTextContent('Total do mês: R$ 2.000,00');
    expect(screen.getByTestId('budget-preview-card')).toHaveTextContent(/R\$ 300,00/);
    // R$ 80 no débito; os R$ 900 da fatura já estão no cartão
    expect(screen.getByTestId('budget-preview-rest-message')).toHaveTextContent('Sobram R$ 420,00 pra fechar o mês no verde');

    await press('budget-save');
    expect(useKashStore.getState().settings).toMatchObject({ monthlyBudget: 2000, cardBudget: 1500 });
    expect(useKashStore.getState().ui.toast).toBe('Limite: R$ 1.500,00 no cartão + R$ 500,00 no restante');

    const { result } = await renderHook(() => useHomeSummary());
    expect(result.current.card).toMatchObject({ budget: 1500, spent: 300 });
    expect(result.current.rest).toMatchObject({ budget: 500, spent: 80 });
  });

  it('juntar de novo volta a um total só', async () => {
    useKashStore.setState((s) => ({ settings: { ...s.settings, monthlyBudget: 2000, cardBudget: 1500 } }));
    await renderWithTheme(<BudgetScreen />);
    await press('budget-split-switch');
    expect(screen.getByTestId('budget-amount')).toHaveTextContent('R$ 2.000,00');
    await press('budget-save');
    expect(useKashStore.getState().settings).toMatchObject({ monthlyBudget: 2000, cardBudget: 0 });
  });
});
