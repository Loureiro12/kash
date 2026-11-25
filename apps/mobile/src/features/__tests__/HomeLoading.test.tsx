import { act, screen } from '@testing-library/react-native';
import React from 'react';
import { HomeScreen } from '@/features/home/HomeScreen';
import { setClock } from '@/lib/clock';
import { useKashStore } from '@/store';
import { renderWithTheme } from '@/test/render';

beforeEach(() => {
  setClock(new Date(2026, 10, 25, 10));
  useKashStore.getState().reset();
});
afterAll(() => setClock(null));

describe('Início carregando', () => {
  it('enquanto o snapshot não chega, mostra só o esqueleto (nada do seed, nem o nome)', async () => {
    useKashStore.getState().setDataStatus('loading');
    await renderWithTheme(<HomeScreen />);
    expect(screen.getByTestId('home-skeleton')).toBeOnTheScreen();
    expect(screen.getByTestId('home-header-skeleton')).toBeOnTheScreen();
    expect(screen.queryByTestId('home-balance')).toBeNull();
    expect(screen.queryByTestId('home-avatar')).toBeNull();
    expect(screen.queryByText(useKashStore.getState().user.name.split(' ')[0]!)).toBeNull();

    // dados chegaram: o conteúdo substitui o esqueleto
    await act(async () => useKashStore.getState().setDataStatus('ready'));
    expect(screen.queryByTestId('home-skeleton')).toBeNull();
    expect(screen.getByTestId('home-balance')).toBeOnTheScreen();
    expect(screen.getByTestId('home-avatar')).toBeOnTheScreen();
  });

  it('erro sem dados: oferece tentar de novo no lugar do conteúdo', async () => {
    useKashStore.getState().setDataStatus('error');
    await renderWithTheme(<HomeScreen />);
    expect(screen.getByTestId('error-state-retry')).toBeOnTheScreen();
    expect(screen.queryByTestId('home-balance')).toBeNull();
  });
});
