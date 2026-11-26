import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, renderHook, screen, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import React from 'react';
import { useAlertPrefs, useReminderSync, useSpendingAlerts } from '@/features/notifications';
import { ProfileScreen } from '@/features/profile/ProfileScreen';
import { setClock } from '@/lib/clock';
import { useKashStore } from '@/store';
import { renderWithTheme } from '@/test/render';

const mocked = Notifications as jest.Mocked<typeof Notifications>;
const shown = () => mocked.scheduleNotificationAsync.mock.calls.map(([req]) => req).filter((r) => r.trigger === null);
const scheduled = () => mocked.scheduleNotificationAsync.mock.calls.map(([req]) => req).filter((r) => r.trigger !== null);

/** gasta `amount` hoje na conta corrente */
const spend = (amount: number, title = 'Compra') =>
  act(() => useKashStore.getState().addTransaction({ kind: 'expense', amountCents: Math.round(amount * 100), category: 'Lazer', sourceId: 'acc1', note: title, installments: 1 }));

beforeEach(async () => {
  // quarta, 25/11/2026
  setClock(new Date(2026, 10, 25, 10));
  await AsyncStorage.clear();
  useAlertPrefs.setState({ spending: true, weekly: true, loaded: false });
  useKashStore.getState().reset();
  useKashStore.setState((s) => ({ userId: 'u-1', txs: [], settings: { ...s.settings, monthlyBudget: 1000, cardBudget: 0 }, ui: { ...s.ui, dataStatus: 'ready' } }));
  jest.clearAllMocks();
  mocked.getPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true, status: 'granted' } as never);
  mocked.requestPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true, status: 'granted' } as never);
});
afterAll(() => setClock(null));

describe('alertas de gastos', () => {
  it('ao cruzar 80% avisa na hora, uma vez só; ao passar do limite avisa de novo', async () => {
    await renderHook(() => useSpendingAlerts());
    await spend(500);
    await act(async () => {});
    expect(shown()).toHaveLength(0);

    await spend(350);
    await waitFor(() => expect(shown()).toHaveLength(1));
    expect(shown()[0]).toMatchObject({ identifier: 'budget:total:2026-11:80', content: { title: 'Você já usou 85% do limite do mês', data: { route: '/report?periodo=mes' } } });

    // outro gasto ainda abaixo de 100%: não repete
    await spend(50);
    await act(async () => {});
    expect(shown()).toHaveLength(1);

    await spend(200);
    await waitFor(() => expect(shown()).toHaveLength(2));
    expect(shown()[1]).toMatchObject({ identifier: 'budget:total:2026-11:100', content: { title: 'Você passou o limite do mês' } });
    expect(JSON.parse((await AsyncStorage.getItem('kash.alerts.sent.u-1'))!)).toEqual(expect.arrayContaining(['budget:total:2026-11:80', 'budget:total:2026-11:100']));
  });

  it('desligado ou sem permissão do sistema: nada', async () => {
    await AsyncStorage.setItem('kash.alerts.prefs', JSON.stringify({ spending: false, weekly: true }));
    await renderHook(() => useSpendingAlerts());
    await spend(900);
    await act(async () => {});
    expect(shown()).toHaveLength(0);

    mocked.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true, status: 'undetermined' } as never);
    await act(() => useAlertPrefs.getState().set('spending', true));
    await spend(10);
    await act(async () => {});
    expect(shown()).toHaveLength(0);
  });

  it('com os dados ainda carregando (exemplo), não avisa', async () => {
    useKashStore.setState((s) => ({ ui: { ...s.ui, dataStatus: 'loading' } }));
    await renderHook(() => useSpendingAlerts());
    await spend(990);
    await act(async () => {});
    expect(shown()).toHaveLength(0);
  });
});

describe('resumo da semana', () => {
  it('agenda para domingo 19h e some ao desligar', async () => {
    await renderHook(() => useReminderSync());
    await spend(120, 'Cinema');
    await waitFor(() => expect(scheduled().some((r) => r.identifier === 'weekly:2026-11-29')).toBe(true));
    const weekly = scheduled().find((r) => r.identifier === 'weekly:2026-11-29')!;
    expect(weekly.content).toMatchObject({ title: 'Sua semana: R$ 120,00 em gastos', data: { route: '/report?periodo=semana' } });
    expect((weekly.trigger as { date: Date }).date).toEqual(new Date(2026, 10, 29, 19, 0, 0, 0));

    jest.clearAllMocks();
    await act(() => useAlertPrefs.getState().set('weekly', false));
    await waitFor(() => expect(mocked.cancelAllScheduledNotificationsAsync).toHaveBeenCalled());
    expect(scheduled().some((r) => r.identifier?.startsWith('weekly:'))).toBe(false);
  });
});

describe('Perfil › Preferências', () => {
  it('as duas opções ligam/desligam e ficam guardadas neste aparelho', async () => {
    await renderWithTheme(<ProfileScreen />);
    await act(async () => {});
    expect(screen.getByTestId('profile-alerts-switch')).toBeChecked();
    expect(screen.getByTestId('profile-weekly-switch')).toBeChecked();
    await fireEvent.press(screen.getByTestId('profile-weekly-switch'));
    await act(async () => {});
    expect(useAlertPrefs.getState().weekly).toBe(false);
    expect(screen.getByTestId('profile-weekly-switch')).not.toBeChecked();
    expect(JSON.parse((await AsyncStorage.getItem('kash.alerts.prefs'))!)).toEqual({ spending: true, weekly: false });
  });
});
