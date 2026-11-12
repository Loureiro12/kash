import { act, fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import * as api from '@kash/supabase-client';
import { DEFAULT_CATEGORIES } from '@kash/domain';
import { ProfileScreen } from '@/features/profile/ProfileScreen';
import { ResetDataSheet } from '@/features/profile/ResetDataSheet';
import { setClock } from '@/lib/clock';
import { useKashStore } from '@/store';
import { renderWithTheme } from '@/test/render';

jest.mock('@/data/source', () => ({ DATA_SOURCE: 'remote' }));
jest.mock('@/services/telemetry', () => ({ track: jest.fn(), setTelemetryEnabled: jest.fn(), telemetryPreference: { get: jest.fn(async () => true) } }));

const mockRouter = { push: jest.fn(), navigate: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, usePathname: () => '/profile' }));

const mocked = api as jest.Mocked<typeof api>;
const { track } = jest.requireMock('@/services/telemetry') as { track: jest.Mock };

beforeEach(() => {
  setClock(new Date(2026, 10, 12, 10));
  useKashStore.getState().reset();
  useKashStore.setState({ auth: 'app', userId: 'u-1' });
  useKashStore.setState((s) => ({ settings: { ...s.settings, monthlyBudget: 3000, cardBudget: 1000, onboardingDone: true, checklistHidden: true, theme: 'light' } }));
  jest.clearAllMocks();
});
afterEach(() => useKashStore.getState().hideToast());
afterAll(() => setClock(null));

async function openSheet() {
  await renderWithTheme(
    <>
      <ProfileScreen />
      <ResetDataSheet />
    </>,
  );
  await fireEvent.press(screen.getByTestId('profile-reset'));
}

describe('Zerar meus dados', () => {
  it('só libera depois de digitar ZERAR; zera o financeiro e mantém login e preferências', async () => {
    await openSheet();
    expect(screen.getByTestId('reset-summary')).toHaveTextContent(/O que é apagado.*O que fica/);
    expect(screen.getByTestId('reset-confirm')).toBeDisabled();
    await fireEvent.changeText(screen.getByTestId('reset-word'), 'zerar');
    expect(screen.getByTestId('reset-confirm')).toBeEnabled();

    await fireEvent.press(screen.getByTestId('reset-confirm'));
    await act(async () => {});

    expect(mocked.resetMyData).toHaveBeenCalledTimes(1);
    const s = useKashStore.getState();
    expect([s.accounts, s.cards, s.txs, s.plans, s.bills, s.goals, s.invoices].every((list) => list.length === 0)).toBe(true);
    expect(s.categories.map((c) => c.name)).toEqual(DEFAULT_CATEGORIES.map((c) => c.name));
    expect(s.settings).toMatchObject({ monthlyBudget: 1800, cardBudget: 0, onboardingDone: false, checklistHidden: false, theme: 'light' });
    expect(s.auth).toBe('app');
    expect(s.userId).toBe('u-1');
    expect(s.ui.sheet).toBeNull();
    expect(s.ui.toast).toBe('Dados zerados. Bora recomeçar!');
    expect(track).toHaveBeenCalledWith('reset_data', {});
    // volta ao Início, onde as boas-vindas aparecem
    expect(mockRouter.navigate).toHaveBeenCalledWith('/');
  });

  it('falha no servidor: nada muda e mostra o erro', async () => {
    mocked.resetMyData.mockRejectedValueOnce(new api.KashApiError('network', 'Sem conexão.'));
    const before = useKashStore.getState();
    await openSheet();
    await fireEvent.changeText(screen.getByTestId('reset-word'), 'ZERAR');
    await fireEvent.press(screen.getByTestId('reset-confirm'));
    await act(async () => {});

    const s = useKashStore.getState();
    expect(s.txs).toBe(before.txs);
    expect(s.accounts.length).toBeGreaterThan(0);
    expect(s.ui.sheet).toBe('resetData');
    expect(s.ui.toast).toBe('Sem conexão.');
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });
});
