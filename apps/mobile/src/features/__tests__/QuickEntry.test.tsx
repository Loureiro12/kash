import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Settings } from 'react-native';
import * as api from '@kash/supabase-client';
import { QUICK_ADD_KEY, QUICK_ADD_TEXT_KEY, takePendingShortcut, textFromParam } from '@/features/quickAdd/quickAdd';
import { useQuickAdd } from '@/features/quickAdd';
import { QuickAddRoute } from '@/features/quickAdd/QuickAddRoute';
import { QuickEntrySheet } from '@/features/quickAdd/QuickEntrySheet';
import { setClock } from '@/lib/clock';
import { useKashStore } from '@/store';
import { renderWithTheme } from '@/test/render';

jest.mock('@/data/source', () => ({ DATA_SOURCE: 'remote' }));
jest.mock('@/services/telemetry', () => ({ track: jest.fn() }));
const mocked = api as jest.Mocked<typeof api>;

const mockRouter = { push: jest.fn(), navigate: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) };
const mockParams: { tipo?: string; texto?: string } = {};
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, usePathname: () => '/', useLocalSearchParams: () => mockParams }));

let defaults: Record<string, unknown> = {};
beforeEach(async () => {
  defaults = {};
  delete mockParams.texto;
  jest.spyOn(Settings, 'get').mockImplementation((key: string) => defaults[key]);
  jest.spyOn(Settings, 'set').mockImplementation((values: object) => {
    Object.assign(defaults, values);
  });
  jest.spyOn(Settings, 'watchKeys').mockImplementation(() => 0);
  jest.spyOn(Settings, 'clearWatch').mockImplementation(() => undefined);
  await AsyncStorage.clear();
  setClock(new Date(2026, 10, 28, 10));
  useKashStore.getState().reset();
  useKashStore.setState((s) => ({ auth: 'app', userId: 'u-1', ui: { ...s.ui, dataStatus: 'ready' } }));
  jest.clearAllMocks();
});
afterAll(() => setClock(null));

const nowSeconds = () => Math.floor(Date.now() / 1000);
const flush = () => act(async () => {});
function Host() {
  useQuickAdd();
  return null;
}

describe('"Lançar no Kash" (Siri) e o link ?texto=', () => {
  it('a App Intent grava o texto; o app lê uma vez e apaga', () => {
    defaults[QUICK_ADD_KEY] = `text:${nowSeconds()}`;
    defaults[QUICK_ADD_TEXT_KEY] = '  gastei 30 no Uber ';
    expect(takePendingShortcut()).toEqual({ text: 'gastei 30 no Uber' });
    expect(defaults[QUICK_ADD_TEXT_KEY]).toBeNull();
    expect(takePendingShortcut()).toBeNull();
    expect(textFromParam(['  ', 'x'])).toBeNull();
  });

  it('com a autorização da IA: abre a confirmação, o assistente propõe e "Lançar" salva e fecha', async () => {
    await AsyncStorage.setItem('kash.assistant.consent', '1');
    const card = useKashStore.getState().cards[0]!;
    mocked.askAssistant.mockResolvedValueOnce({
      reply: 'Confere e toque em Lançar.',
      remaining: 30,
      proposals: [{ kind: 'expense', amount: 30, title: 'Uber', category: 'Transporte', sourceId: card.id, date: '2026-11-28', installments: 1 }],
    });
    defaults[QUICK_ADD_KEY] = `text:${nowSeconds()}`;
    defaults[QUICK_ADD_TEXT_KEY] = 'gastei 30 no Uber';
    await render(<Host />);
    await flush();
    expect(useKashStore.getState().ui).toMatchObject({ sheet: 'quickEntry', quickEntryText: 'gastei 30 no Uber' });

    await renderWithTheme(<QuickEntrySheet />);
    await flush();
    expect(screen.getByTestId('quick-entry-text')).toHaveTextContent('“gastei 30 no Uber”');
    expect(mocked.askAssistant.mock.calls[0]![1].messages).toEqual([{ role: 'user', content: 'gastei 30 no Uber' }]);
    await fireEvent.press(screen.getByTestId('quick-entry-proposal-0-confirm'));
    expect(useKashStore.getState().txs[0]).toMatchObject({ title: 'Uber', amount: -30, category: 'Transporte', sourceId: card.id });
    expect(useKashStore.getState().ui.sheet).toBeNull();
    expect(useKashStore.getState().ui.toast).toBe('Uber lançado');
  });

  it('sem proposta: mostra a resposta e oferece continuar no assistente', async () => {
    mocked.askAssistant.mockResolvedValueOnce({ reply: 'Quanto foi o Uber?', remaining: 30 });
    await act(() => useKashStore.getState().openQuickEntry('Uber'));
    await renderWithTheme(<QuickEntrySheet />);
    await flush();
    expect(screen.getByText('Quanto foi o Uber?')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('quick-entry-chat'));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/assistant', params: { texto: 'Uber' } });
  });

  it('sem a autorização da IA: vai para o assistente (que pede antes) com o texto', async () => {
    defaults[QUICK_ADD_KEY] = `text:${nowSeconds()}`;
    defaults[QUICK_ADD_TEXT_KEY] = 'recebi 200 de freela';
    await render(<Host />);
    await flush();
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/assistant', params: { texto: 'recebi 200 de freela' } });
    expect(useKashStore.getState().ui.sheet).toBeNull();
  });

  it('link …://lancar?texto= pede o lançamento por texto', async () => {
    mockParams.texto = 'gastei 12 no café';
    await render(<QuickAddRoute />);
    expect(useKashStore.getState().ui.quickAdd).toEqual({ text: 'gastei 12 no café' });
  });
});
