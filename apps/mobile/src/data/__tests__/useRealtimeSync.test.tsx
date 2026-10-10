import { renderHook } from '@testing-library/react-native';
import * as api from '@kash/supabase-client';
import { REALTIME_DEBOUNCE_MS, useRealtimeSync } from '@/data/useRealtimeSync';
import { queryClient } from '@/data/queryClient';

const mocked = api as jest.Mocked<typeof api>;

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});
afterEach(() => jest.useRealTimers());

function setup() {
  const stop = jest.fn();
  let handlers!: api.UserChangesHandlers;
  mocked.subscribeToUserChanges.mockImplementation((_db, _uid, h) => {
    handlers = h;
    return stop;
  });
  const invalidate = jest.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);
  return { stop, invalidate, handlers: () => handlers };
}

describe('tempo real no app', () => {
  it('assina o canal do usuário e junta uma rajada de avisos num só recarregamento', async () => {
    const { invalidate, handlers } = setup();
    await renderHook(() => useRealtimeSync('u-1', true));
    expect(mocked.subscribeToUserChanges).toHaveBeenCalledWith(expect.anything(), 'u-1', expect.any(Object));
    handlers().onChange({ table: 'plans', op: 'insert' });
    handlers().onChange({ table: 'transactions', op: 'insert' });
    expect(invalidate).not.toHaveBeenCalled();
    jest.advanceTimersByTime(REALTIME_DEBOUNCE_MS);
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['snapshot'] });
  });

  it('recarrega ao reconectar, mas não na primeira conexão', async () => {
    const { invalidate, handlers } = setup();
    await renderHook(() => useRealtimeSync('u-1', true));
    handlers().onSubscribed?.(false);
    jest.advanceTimersByTime(REALTIME_DEBOUNCE_MS);
    expect(invalidate).not.toHaveBeenCalled();
    handlers().onSubscribed?.(true);
    jest.advanceTimersByTime(REALTIME_DEBOUNCE_MS);
    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it('sem usuário ou no modo demonstração não assina; ao sair cancela', async () => {
    const { stop } = setup();
    await renderHook(() => useRealtimeSync(null, true));
    await renderHook(() => useRealtimeSync('u-1', false));
    expect(mocked.subscribeToUserChanges).not.toHaveBeenCalled();
    const { unmount } = await renderHook(() => useRealtimeSync('u-2', true));
    await unmount();
    expect(stop).toHaveBeenCalled();
  });
});
