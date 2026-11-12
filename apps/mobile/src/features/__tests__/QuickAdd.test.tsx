import { act, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Settings } from 'react-native';
import { QUICK_ADD_KEY, kindFromParam, parsePending, takePendingShortcut } from '@/features/quickAdd/quickAdd';
import { useQuickAdd } from '@/features/quickAdd';
import { QuickAddRoute } from '@/features/quickAdd/QuickAddRoute';
import { TransactionSheet } from '@/features/transactions/TransactionSheet';
import { useKashStore } from '@/store';
import { renderWithTheme } from '@/test/render';

jest.mock('@/services/telemetry', () => ({ track: jest.fn() }));
const { track } = jest.requireMock('@/services/telemetry') as { track: jest.Mock };

const mockRouter = { push: jest.fn(), navigate: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) };
const mockParams: { tipo?: string } = {};
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/',
  useLocalSearchParams: () => mockParams,
}));

/** UserDefaults falso (o Settings do RN não tem módulo nativo no Jest) */
let defaults: Record<string, unknown> = {};
let watcher: (() => void) | null = null;
beforeEach(() => {
  defaults = {};
  watcher = null;
  jest.spyOn(Settings, 'get').mockImplementation((key: string) => defaults[key]);
  jest.spyOn(Settings, 'set').mockImplementation((values: object) => {
    Object.assign(defaults, values);
  });
  jest.spyOn(Settings, 'watchKeys').mockImplementation((_keys: string | string[], cb: () => void) => {
    watcher = cb;
    return 0;
  });
  jest.spyOn(Settings, 'clearWatch').mockImplementation(() => undefined);
  useKashStore.getState().reset();
  track.mockClear();
  mockRouter.replace.mockClear();
  mockRouter.back.mockClear();
});

const nowSeconds = () => Math.floor(Date.now() / 1000);

function Host() {
  useQuickAdd();
  return null;
}

describe('pedido da App Intent', () => {
  it('aceita gasto/entrada recentes e ignora antigos ou inválidos', () => {
    const now = 1_800_000_000;
    expect(parsePending(`expense:${now - 5}`, now)).toBe('expense');
    expect(parsePending(`income:${now}`, now)).toBe('income');
    expect(parsePending(`income:${now - 11 * 60}`, now)).toBeNull();
    expect(parsePending('transfer:1', now)).toBeNull();
    expect(parsePending(null, now)).toBeNull();
  });

  it('o link aceita tipo=entrada e cai em gasto por padrão', () => {
    expect(kindFromParam('entrada')).toBe('income');
    expect(kindFromParam('gasto')).toBe('expense');
    expect(kindFromParam(undefined)).toBe('expense');
  });

  it('lê uma vez e apaga', () => {
    defaults[QUICK_ADD_KEY] = `income:${nowSeconds()}`;
    expect(takePendingShortcut()).toBe('income');
    expect(defaults[QUICK_ADD_KEY]).toBeNull();
    expect(takePendingShortcut()).toBeNull();
  });
});

describe('useQuickAdd', () => {
  it('app aberto pelo atalho: abre o lançamento já como entrada', async () => {
    defaults[QUICK_ADD_KEY] = `income:${nowSeconds()}`;
    await render(<Host />);
    const ui = useKashStore.getState().ui;
    expect(ui.sheet).toBe('expense');
    expect(ui.newTxKind).toBe('income');
    expect(ui.quickAdd).toBeNull();
    expect(track).toHaveBeenCalledWith('quick_add', { kind: 'income', via: 'shortcut' });
  });

  it('atalho com o app já aberto (UserDefaults mudou)', async () => {
    await render(<Host />);
    expect(useKashStore.getState().ui.sheet).toBeNull();
    defaults[QUICK_ADD_KEY] = `expense:${nowSeconds()}`;
    await act(async () => watcher?.());
    expect(useKashStore.getState().ui).toMatchObject({ sheet: 'expense', newTxKind: 'expense' });
  });

  it('com o Face ID ligado, só abre depois de desbloquear', async () => {
    useKashStore.setState({ locked: true });
    defaults[QUICK_ADD_KEY] = `expense:${nowSeconds()}`;
    await render(<Host />);
    expect(useKashStore.getState().ui.sheet).toBeNull();
    await act(async () => useKashStore.getState().unlock());
    expect(useKashStore.getState().ui.sheet).toBe('expense');
  });
});

describe('link …://lancar', () => {
  it('pede a entrada e volta ao Início quando o app abriu pelo link', async () => {
    mockParams.tipo = 'entrada';
    await render(<QuickAddRoute />);
    expect(useKashStore.getState().ui.quickAdd).toBe('income');
    expect(mockRouter.replace).toHaveBeenCalledWith('/');
    expect(track).toHaveBeenCalledWith('quick_add', { kind: 'income', via: 'link' });
  });
});

describe('sheet de lançamento', () => {
  it('abre no tipo pedido; o botão + continua abrindo em gasto', async () => {
    await act(async () => useKashStore.getState().openNewTransaction('income'));
    await renderWithTheme(<TransactionSheet />);
    expect(screen.getByTestId('tx-kind-income')).toBeSelected();
    await act(async () => useKashStore.getState().openSheet('expense'));
    expect(screen.getByTestId('tx-kind-expense')).toBeSelected();
  });
});
