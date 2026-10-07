import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { Linking } from 'react-native';
import { useReminderSync, useToggleBillReminder } from '@/features/notifications';
import { setClock } from '@/lib/clock';
import { useKashStore } from '@/store';

const mocked = Notifications as jest.Mocked<typeof Notifications>;
const scheduled = () => mocked.scheduleNotificationAsync.mock.calls.map(([req]) => req);

beforeEach(() => {
  setClock(new Date(2026, 9, 6, 10));
  useKashStore.getState().reset();
  jest.clearAllMocks();
  mocked.getPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true, status: 'granted' } as never);
  mocked.requestPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true, status: 'granted' } as never);
});
afterAll(() => setClock(null));

describe('useReminderSync', () => {
  it('agenda o plano do domínio (cancelando o anterior) com rota e horário locais', async () => {
    await renderHook(() => useReminderSync());
    await waitFor(() => expect(mocked.scheduleNotificationAsync).toHaveBeenCalled());
    expect(mocked.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    const internet = scheduled().find((r) => r.identifier?.startsWith('bill:bill2'));
    expect(internet?.content).toMatchObject({ title: 'Internet vence em 2 dias', data: { route: '/accounts' } });
    expect((internet?.trigger as { date: Date }).date).toEqual(new Date(2026, 9, 8, 9, 0, 0, 0));
  });

  it('reagenda quando uma conta é paga e cancela tudo ao desligar a preferência', async () => {
    await renderHook(() => useReminderSync());
    await waitFor(() => expect(scheduled().some((r) => r.identifier?.startsWith('bill:bill2:2026-10'))).toBe(true));
    jest.clearAllMocks();
    await act(() => useKashStore.getState().toggleBillPaid('bill2'));
    await waitFor(() => expect(mocked.scheduleNotificationAsync).toHaveBeenCalled());
    expect(scheduled().some((r) => r.identifier?.startsWith('bill:bill2:2026-10'))).toBe(false);
    expect(scheduled().some((r) => r.identifier?.startsWith('bill:bill2:2026-11'))).toBe(true);
    jest.clearAllMocks();
    await act(() => useKashStore.getState().toggleBillReminder());
    await waitFor(() => expect(mocked.cancelAllScheduledNotificationsAsync).toHaveBeenCalled());
    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('sem permissão do sistema não agenda nada', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true, status: 'undetermined' } as never);
    await renderHook(() => useReminderSync());
    await waitFor(() => expect(mocked.cancelAllScheduledNotificationsAsync).toHaveBeenCalled());
    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});

describe('useToggleBillReminder', () => {
  it('ligar pede permissão; negada → fica desligado e toast leva aos Ajustes', async () => {
    useKashStore.setState((s) => ({ settings: { ...s.settings, billReminder: false } }));
    mocked.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true, status: 'undetermined' } as never);
    mocked.requestPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false, status: 'denied' } as never);
    const open = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    const { result } = await renderHook(() => useToggleBillReminder());
    await act(() => result.current(true));
    expect(mocked.requestPermissionsAsync).toHaveBeenCalled();
    expect(useKashStore.getState().settings.billReminder).toBe(false);
    expect(useKashStore.getState().ui.toast).toMatch(/Ajustes/);
    useKashStore.getState().ui.toastAction?.onPress();
    expect(open).toHaveBeenCalled();
  });

  it('permissão concedida → liga; desligar não pede permissão', async () => {
    useKashStore.setState((s) => ({ settings: { ...s.settings, billReminder: false } }));
    mocked.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true, status: 'undetermined' } as never);
    const { result } = await renderHook(() => useToggleBillReminder());
    await act(() => result.current(true));
    expect(useKashStore.getState().settings.billReminder).toBe(true);
    jest.clearAllMocks();
    const { result: again } = await renderHook(() => useToggleBillReminder());
    await act(() => again.current(false));
    expect(mocked.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(useKashStore.getState().settings.billReminder).toBe(false);
  });
});
