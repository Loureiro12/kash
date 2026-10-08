import { act, fireEvent, screen } from '@testing-library/react-native';
import { forecast, formatBRL } from '@kash/domain';
import React from 'react';
import { ForecastScreen } from '@/features/forecast/ForecastScreen';
import { setClock } from '@/lib/clock';
import { useKashStore } from '@/store';
import { renderWithTheme } from '@/test/render';

beforeEach(() => {
  setClock(new Date(2026, 9, 15, 10));
  useKashStore.getState().reset();
});
afterAll(() => setClock(null));

describe('Previsão', () => {
  it('tocar nos meses recalcula total, divisão, limite e acumulado', async () => {
    const s = useKashStore.getState();
    const months = forecast(s.plans, s.bills, s.cards, new Date(2026, 9, 15, 10), s.accounts);
    await renderWithTheme(<ForecastScreen />);

    expect(screen.getByTestId('forecast-month-heading')).toHaveTextContent('Comprometido em novembro');
    expect(screen.getByTestId('forecast-month-total')).toHaveTextContent(formatBRL(months[0]!.total));
    expect(screen.getByTestId('forecast-cumulative-label')).toHaveTextContent('Acumulado em novembro');
    expect(screen.getByTestId('forecast-month-1')).toBeSelected();

    await fireEvent.press(screen.getByTestId('forecast-month-4'));
    await act(async () => {});
    const m4 = months[3]!;
    expect(screen.getByTestId('forecast-month-4')).toBeSelected();
    expect(screen.getByTestId('forecast-month-heading')).toHaveTextContent(`Comprometido em ${m4.name}`);
    expect(screen.getByTestId('forecast-month-total')).toHaveTextContent(formatBRL(m4.total));
    expect(screen.getByTestId('forecast-month-installments')).toHaveTextContent(`Parcelas ${formatBRL(m4.installments)}`);
    expect(screen.getByTestId('forecast-cumulative-label')).toHaveTextContent(`Acumulado de novembro a ${m4.name}`);
    const cumulative = Math.round(months.slice(0, 4).reduce((a, m) => a + m.total, 0) * 100) / 100;
    expect(screen.getByTestId('forecast-cumulative')).toHaveTextContent(formatBRL(cumulative));
    expect(screen.getByTestId('forecast-selected-title')).toHaveTextContent(`Em ${m4.name}`);
  });

  it('mostra quando o mês passa do limite', async () => {
    useKashStore.setState((s) => ({ settings: { ...s.settings, monthlyBudget: 1000 } }));
    await renderWithTheme(<ForecastScreen />);
    expect(screen.getByTestId('forecast-month-budget')).toHaveTextContent(/passa R\$ 214,40/);
  });
});
