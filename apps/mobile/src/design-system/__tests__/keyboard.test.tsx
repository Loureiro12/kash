import { act, renderHook } from '@testing-library/react-native';
import { Keyboard, Platform } from 'react-native';
import { useKeyboardInset } from '../components/keyboard';

type Listener = (e: { endCoordinates: { height: number } }) => void;

describe('useKeyboardInset', () => {
  const listeners: Record<string, Listener> = {};
  beforeEach(() => {
    jest.spyOn(Keyboard, 'addListener').mockImplementation(((event: string, cb: Listener) => {
      listeners[event] = cb;
      return { remove: jest.fn() };
    }) as never);
  });
  afterEach(() => {
    jest.restoreAllMocks();
    Platform.OS = 'ios';
  });

  it('Android (edge-to-edge): devolve a altura do teclado enquanto ele está aberto', async () => {
    Platform.OS = 'android';
    const { result } = await renderHook(() => useKeyboardInset());
    expect(result.current).toBe(0);
    await act(() => listeners.keyboardDidShow!({ endCoordinates: { height: 312 } }));
    expect(result.current).toBe(312);
    await act(() => listeners.keyboardDidHide!({ endCoordinates: { height: 0 } }));
    expect(result.current).toBe(0);
  });

  it('iOS: sempre 0 (o KeyboardAvoidingView cuida)', async () => {
    Platform.OS = 'ios';
    const { result } = await renderHook(() => useKeyboardInset());
    expect(Keyboard.addListener).not.toHaveBeenCalled();
    expect(result.current).toBe(0);
  });
});
