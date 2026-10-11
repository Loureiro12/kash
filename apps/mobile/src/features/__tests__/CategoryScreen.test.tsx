import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import { CategoryScreen } from '@/features/report/CategoryScreen';
import { ReportScreen } from '@/features/report/ReportScreen';
import { setClock } from '@/lib/clock';
import { useKashStore } from '@/store';
import { renderWithTheme } from '@/test/render';

const mockPush = jest.fn();
const mockSetParams = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, navigate: jest.fn(), replace: jest.fn(), back: jest.fn(), setParams: mockSetParams }),
  usePathname: () => '/category/Comida',
  useLocalSearchParams: () => ({ name: 'Comida' }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  setClock(new Date(2026, 9, 15, 12));
  useKashStore.getState().reset();
  const acc = useKashStore.getState().accounts[0]!.id;
  useKashStore.setState({
    auth: 'app',
    userId: 'u-1',
    txs: [
      { id: 'a', title: 'iFood', category: 'Comida', amount: -60, date: '2026-10-12', sourceId: acc },
      { id: 'b', title: 'Padaria', category: 'Comida', amount: -20, date: '2026-10-10', sourceId: acc },
      { id: 'c', title: 'iFood', category: 'Comida', amount: -40, date: '2026-10-03', sourceId: acc },
      { id: 'd', title: 'Mercado', category: 'Mercado', amount: -280, date: '2026-10-02', sourceId: acc },
      { id: 'e', title: 'Restaurante', category: 'Comida', amount: -150, date: '2026-09-20', sourceId: acc },
    ],
  });
});
afterEach(() => setClock(null));

describe('Gastos por categoria', () => {
  it('Relatório leva para a categoria', async () => {
    await renderWithTheme(<ReportScreen />);
    await fireEvent.press(screen.getByTestId('report-cat-Comida'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/category/[name]', params: { name: 'Comida' } });
  });

  it('mês atual: total, comparação, onde mais gastou e os lançamentos', async () => {
    await renderWithTheme(<CategoryScreen />);
    expect(screen.getByTestId('category-total')).toHaveTextContent('R$ 120,00');
    expect(screen.getByTestId('category-delta')).toHaveTextContent('20% a menos que setembro');
    expect(screen.getByTestId('category-stats')).toHaveTextContent('30% dos seus gastos do mês · 3 lançamentos · média de R$ 40,00');
    expect(screen.getByTestId('category-place-0')).toHaveTextContent(/iFood.*2×.*R\$ 100,00 · 83%/);
    expect(screen.getByTestId('category-tx-a')).toBeTruthy();
    expect(screen.queryByTestId('category-tx-d')).toBeNull();
  });

  it('tocar num mês mostra o dele; trocar de categoria pelos chips', async () => {
    await renderWithTheme(<CategoryScreen />);
    await fireEvent.press(screen.getByTestId('category-month--1'));
    expect(screen.getByTestId('category-month-heading')).toHaveTextContent('Comida em setembro');
    expect(screen.getByTestId('category-total')).toHaveTextContent('R$ 150,00');
    expect(screen.getByTestId('category-tx-e')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('category-chip-Mercado'));
    expect(mockSetParams).toHaveBeenCalledWith({ name: 'Mercado' });
    expect(screen.getByTestId('category-month-heading')).toHaveTextContent('Mercado em setembro');
    expect(screen.getByTestId('category-empty')).toBeTruthy();
  });
});
