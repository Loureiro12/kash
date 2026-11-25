import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import { HomeScreen } from '@/features/home/HomeScreen';
import { ReportScreen } from '@/features/report/ReportScreen';
import { setClock } from '@/lib/clock';
import { useKashStore } from '@/store';
import { renderWithTheme } from '@/test/render';

const mockPush = jest.fn();
let mockParams: { periodo?: string } = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, navigate: jest.fn(), replace: jest.fn(), back: jest.fn(), setParams: jest.fn() }),
  usePathname: () => '/report',
  useLocalSearchParams: () => mockParams,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  // quarta-feira, 25/11/2026
  setClock(new Date(2026, 10, 25, 12));
  useKashStore.getState().reset();
  const acc = useKashStore.getState().accounts[0]!.id;
  useKashStore.setState((s) => ({
    auth: 'app',
    userId: 'u-1',
    settings: { ...s.settings, monthlyBudget: 1800 },
    txs: [
      { id: 'a', title: 'iFood', category: 'Comida', amount: -60, date: '2026-11-25', sourceId: acc },
      { id: 'b', title: 'Uber', category: 'Transporte', amount: -25, date: '2026-11-25', sourceId: acc },
      { id: 'c', title: 'Salário', category: 'Entrada', amount: 3000, date: '2026-11-25', sourceId: acc },
      { id: 'd', title: 'Mercado', category: 'Mercado', amount: -200, date: '2026-11-23', sourceId: acc },
      { id: 'e', title: 'Cinema', category: 'Lazer', amount: -100, date: '2026-11-18', sourceId: acc },
      { id: 'f', title: 'Aluguel', category: 'Outros', amount: -1000, date: '2026-10-05', sourceId: acc },
    ],
  }));
});
afterAll(() => setClock(null));

const press = (id: string) => fireEvent.press(screen.getByTestId(id));

describe('Relatório por período', () => {
  it('abre no mês: total, ritmo contra o limite e maiores gastos', async () => {
    await renderWithTheme(<ReportScreen />);
    expect(screen.getByTestId('report-period-label')).toHaveTextContent('Novembro');
    expect(screen.getByTestId('report-total')).toHaveTextContent('R$ 385,00');
    expect(screen.getByTestId('report-budget-message')).toHaveTextContent('No ritmo atual, você fecha o mês em R$ 462,00, dentro do limite');
    expect(screen.getByTestId('report-insight-average')).toHaveTextContent('Sua média é R$ 1.000,00 por mês');
    expect(screen.getByTestId('report-top')).toHaveTextContent(/Mercado.*Cinema.*iFood/);
    expect(screen.getByTestId('report-next')).toBeDisabled();
  });

  it('semana: compara com a semana passada até hoje; volta e avança de período', async () => {
    await renderWithTheme(<ReportScreen />);
    await press('report-period-week');
    expect(screen.getByTestId('report-period-label')).toHaveTextContent('Esta semana');
    expect(screen.getByTestId('report-total')).toHaveTextContent('R$ 285,00');
    expect(screen.getByTestId('report-delta')).toHaveTextContent('185% a mais que a semana passada até quarta');
    expect(screen.getByTestId('report-insight-peak')).toHaveTextContent('Dia que mais gastou: segunda, 23 nov (R$ 200,00)');

    await press('report-prev');
    expect(screen.getByTestId('report-period-label')).toHaveTextContent('Semana passada');
    expect(screen.getByTestId('report-total')).toHaveTextContent('R$ 100,00');
    // "voltar pra hoje" aparece fora do período atual
    await press('report-today');
    expect(screen.getByTestId('report-period-label')).toHaveTextContent('Esta semana');
  });

  it('toque numa barra abre o dia, com entradas e gastos na lista', async () => {
    await renderWithTheme(<ReportScreen />);
    await press('report-period-week');
    await press('report-bar-2026-11-25');
    expect(screen.getByTestId('report-period-label')).toHaveTextContent('Hoje');
    expect(screen.getByTestId('report-period-day')).toBeSelected();
    expect(screen.getByTestId('report-total')).toHaveTextContent('R$ 85,00');
    expect(screen.getByTestId('report-income')).toHaveTextContent('↑ R$ 3.000,00 entrou');
    expect(screen.getByTestId('report-day-list')).toHaveTextContent(/Salário/);
    // limite do dia = 1800 / 30
    expect(screen.getByTestId('report-budget-message')).toHaveTextContent('Passou R$ 25,00 do limite do dia');
    // dias futuros não abrem
    expect(screen.getByTestId('report-bar-2026-11-27')).toBeDisabled();
  });

  it('abre direto no período pedido pelo Início', async () => {
    mockParams = { periodo: 'dia' };
    await renderWithTheme(<ReportScreen />);
    expect(screen.getByTestId('report-period-label')).toHaveTextContent('Hoje');
  });

  it('dia sem nada lançado', async () => {
    useKashStore.setState({ txs: [] });
    mockParams = { periodo: 'dia' };
    await renderWithTheme(<ReportScreen />);
    expect(screen.getByTestId('report-insight-empty')).toHaveTextContent('Nada lançado neste dia.');
    expect(screen.getByTestId('report-day-empty')).toBeOnTheScreen();
    expect(screen.getByTestId('report-prev')).toBeDisabled();
  });
});

describe('Início: atalhos de hoje e da semana', () => {
  it('mostram o gasto e abrem o relatório no período', async () => {
    await renderWithTheme(<HomeScreen />);
    expect(screen.getByTestId('home-report-day')).toHaveTextContent(/Hoje.*R\$ 85,00/);
    expect(screen.getByTestId('home-report-week')).toHaveTextContent(/Esta semana.*R\$ 285,00/);
    await press('home-report-week');
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/report', params: { periodo: 'semana' } });
  });
});
