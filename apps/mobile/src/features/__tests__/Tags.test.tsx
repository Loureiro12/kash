import { act, fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import * as api from '@kash/supabase-client';
import type { Tx } from '@kash/domain';
import { __resetRemoteActionsForTests, installRemoteActions } from '@/data/remoteActions';
import { HomeScreen } from '@/features/home/HomeScreen';
import { TagDetailScreen } from '@/features/tags/TagDetailScreen';
import { TagsScreen } from '@/features/tags/TagsScreen';
import { TransactionSheet } from '@/features/transactions/TransactionSheet';
import { setClock } from '@/lib/clock';
import { useKashStore } from '@/store';
import { typeAmount } from '@/test/amount';
import { renderWithTheme } from '@/test/render';

jest.mock('@/data/source', () => ({ DATA_SOURCE: 'remote' }));
const mocked = api as jest.Mocked<typeof api>;
const mockParams: { tag?: string } = {};
const mockRouter = { push: jest.fn(), navigate: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, usePathname: () => '/', useLocalSearchParams: () => mockParams }));

const tx = (id: string, date: string, amount: number, category: string, tag?: string): Tx => ({ id, title: category, category, amount, date, sourceId: 'acc1', sourceType: 'account', ...(tag ? { tag } : {}) });

beforeEach(() => {
  setClock(new Date(2026, 10, 28, 10));
  __resetRemoteActionsForTests();
  useKashStore.getState().reset();
  useKashStore.setState((s) => ({
    auth: 'app',
    userId: 'u-1',
    txs: [tx('a', '2026-11-20', -300, 'Lazer', 'Viagem Floripa'), tx('b', '2026-11-21', -120, 'Comida', 'Viagem Floripa'), tx('c', '2026-11-22', -50, 'Mercado')],
    ui: { ...s.ui, dataStatus: 'ready' },
  }));
  delete mockParams.tag;
  jest.clearAllMocks();
});
afterAll(() => setClock(null));

const press = (id: string) => fireEvent.press(screen.getByTestId(id));

describe('Tags', () => {
  it('lançamento com tag nova vai para o servidor; a tag aparece na linha', async () => {
    installRemoteActions();
    await act(() => useKashStore.getState().openSheet('expense'));
    await renderWithTheme(<TransactionSheet />);
    await press('chip-src-acc1');
    await typeAmount('expense-amount', ['45', '00']);
    await press('tag-add');
    await fireEvent.changeText(screen.getByTestId('tag-input'), '  Aniversário   Ana ');
    await press('tag-use');
    expect(screen.getByTestId('tag-current')).toHaveTextContent(/# Aniversário Ana/);
    await press('expense-save');
    await act(async () => {});
    expect(useKashStore.getState().txs[0]).toMatchObject({ amount: -45, tag: 'Aniversário Ana' });
    expect(mocked.createTransaction).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ tag: 'Aniversário Ana' }));
  });

  it('tags recentes aparecem para escolher; editar pode tirar a tag', async () => {
    await act(() => useKashStore.getState().openTransaction('a'));
    await renderWithTheme(<TransactionSheet />);
    expect(screen.getByTestId('tag-current')).toHaveTextContent(/# Viagem Floripa/);
    await press('tag-current');
    expect(screen.getByTestId('tag-add')).toBeOnTheScreen();
    await press('expense-save');
    expect(useKashStore.getState().txs.find((t) => t.id === 'a')?.tag).toBeUndefined();
  });

  it('modo viagem: liga pela lista, o lançamento novo já vem com a tag, Início mostra a faixa, e encerra', async () => {
    installRemoteActions();
    await renderWithTheme(<TagsScreen />);
    expect(screen.getByTestId('tags-row-0')).toHaveTextContent(/# Viagem Floripa/);
    await fireEvent.changeText(screen.getByTestId('travel-name'), 'Viagem Floripa');
    await press('travel-until-date');
    await press('travel-calendar-day-2026-12-03');
    await press('travel-go');
    expect(useKashStore.getState().settings).toMatchObject({ travelTag: 'Viagem Floripa', travelUntil: '2026-12-03' });
    await act(async () => {});
    expect(mocked.updateSettings).toHaveBeenCalledWith(expect.anything(), { travelTag: 'Viagem Floripa', travelUntil: '2026-12-03' });
    expect(screen.getByTestId('travel-active-details')).toHaveTextContent(/R\$ 420,00 até agora/);

    await act(() => useKashStore.getState().openSheet('expense'));
    await renderWithTheme(<TransactionSheet />);
    expect(screen.getByTestId('tag-current')).toHaveTextContent(/# Viagem Floripa/);

    await renderWithTheme(<HomeScreen />);
    expect(screen.getByTestId('home-travel-spent')).toHaveTextContent('R$ 420,00');

    await act(() => useKashStore.getState().setTravelMode(null));
    expect(useKashStore.getState().settings).toMatchObject({ travelTag: null, travelUntil: null });
  });

  it('detalhe da tag: total, por dia e por categoria', async () => {
    mockParams.tag = 'viagem floripa';
    await renderWithTheme(<TagDetailScreen />);
    expect(screen.getByTestId('tag-total')).toHaveTextContent('R$ 420,00');
    expect(screen.getByTestId('tag-meta')).toHaveTextContent(/2 lançamentos em 2 dias/);
    expect(screen.getByTestId('tag-categories')).toHaveTextContent(/Lazer.*R\$ 300,00 · 71%/);
  });
});
