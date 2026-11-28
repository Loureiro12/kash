import { act, fireEvent, screen } from '@testing-library/react-native';
import * as Sharing from 'expo-sharing';
import React from 'react';
import { captureRef } from 'react-native-view-shot';
import type { Tx } from '@kash/domain';
import { HomeScreen } from '@/features/home/HomeScreen';
import { RecapScreen } from '@/features/recap/RecapScreen';
import { setClock } from '@/lib/clock';
import { useKashStore } from '@/store';
import { renderWithTheme } from '@/test/render';

jest.mock('react-native-view-shot', () => ({ captureRef: jest.fn(async () => 'file:///recap.png') }));
jest.mock('expo-sharing', () => ({ shareAsync: jest.fn(async () => undefined), isAvailableAsync: jest.fn(async () => true) }));
jest.mock('@/services/telemetry', () => ({ track: jest.fn() }));
const { track } = jest.requireMock('@/services/telemetry') as { track: jest.Mock };

let seq = 0;
const tx = (date: string, amount: number, category: string, title = category): Tx => ({ id: `r${++seq}`, title, category, amount, date, sourceId: 'acc1' });
const txs = [
  tx('2026-09-10', -1000, 'Mercado'),
  tx('2026-10-05', 5000, 'Entrada', 'Salário'),
  tx('2026-10-02', -600, 'Mercado', 'Mercado Extra'),
  tx('2026-10-15', -300, 'Lazer', 'Show'),
  tx('2026-10-20', -300, 'Comida', 'Restaurante'),
];

beforeEach(() => {
  // 3 de novembro: a retrospectiva de outubro está pronta
  setClock(new Date(2026, 10, 3, 10));
  useKashStore.getState().reset();
  useKashStore.setState((s) => ({ auth: 'app', userId: 'u-1', txs, settings: { ...s.settings, monthlyBudget: 1500, cardBudget: 0, hideValues: false }, ui: { ...s.ui, dataStatus: 'ready' } }));
  jest.clearAllMocks();
});
afterAll(() => setClock(null));

const press = (id: string) => fireEvent.press(screen.getByTestId(id));

describe('Retrospectiva do mês', () => {
  it('mostra o mês que fechou com os números e compartilha como imagem', async () => {
    await renderWithTheme(<RecapScreen />);
    expect(screen.getByTestId('recap-heading')).toHaveTextContent('Seu outubro');
    expect(screen.getByTestId('recap-income')).toHaveTextContent('R$ 5.000,00');
    expect(screen.getByTestId('recap-spent')).toHaveTextContent('R$ 1.200,00');
    expect(screen.getByTestId('recap-saved')).toHaveTextContent('Sobraram R$ 3.800,00 (76% do que entrou)');
    expect(screen.getByTestId('recap-vs-prev')).toHaveTextContent(/20% a mais que em setembro/);
    expect(screen.getByTestId('recap-budget')).toHaveTextContent(/Ficou R\$ 300,00 dentro do limite/);
    expect(screen.queryByTestId('recap-next')).toBeNull();

    await press('recap-share');
    await act(async () => {});
    expect(captureRef).toHaveBeenCalled();
    expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///recap.png', expect.objectContaining({ mimeType: 'image/png' }));
    expect(track).toHaveBeenCalledWith('recap_shared', { hidden: false });
  });

  it('esconder valores: só porcentagens na imagem', async () => {
    await renderWithTheme(<RecapScreen />);
    await press('recap-hide');
    expect(screen.getByTestId('recap-income')).not.toHaveTextContent(/5\.000/);
    expect(screen.getByTestId('recap-saved')).toHaveTextContent('Sobraram 76% do que entrou');
    expect(screen.getByTestId('recap-budget')).toHaveTextContent(/Ficou dentro do limite \(80% usado\)/);
    expect(screen.getByTestId('recap-categories')).toHaveTextContent(/Mercado50%/);
  });

  it('mês anterior sem lançamentos mostra o vazio; Início avisa nos primeiros dias do mês', async () => {
    await renderWithTheme(<RecapScreen />);
    await press('recap-prev');
    await press('recap-prev');
    expect(screen.getByTestId('recap-empty')).toBeOnTheScreen();
  });

  it('card no Início até o dia 7', async () => {
    await renderWithTheme(<HomeScreen />);
    expect(screen.getByTestId('home-recap')).toBeOnTheScreen();
  });
});
