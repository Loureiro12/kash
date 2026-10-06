import { act, fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import * as api from '@kash/supabase-client';
import { LoginScreen } from '@/features/auth/LoginScreen';
import { useKashStore } from '@/store';
import { renderWithTheme } from '@/test/render';

beforeEach(() => {
  useKashStore.getState().reset();
  useKashStore.getState().start();
});

describe('LoginScreen', () => {
  it('valida campos vazios', async () => {
    await renderWithTheme(<LoginScreen />);
    await fireEvent.press(screen.getByTestId('login-submit'));
    expect(screen.getByText('Informe seu e-mail ou celular.')).toBeOnTheScreen();
    expect(screen.getByText('Informe sua senha.')).toBeOnTheScreen();
  });
  it('credencial inválida mostra erro, limpa a senha e a segunda tentativa entra', async () => {
    const mocked = api as jest.Mocked<typeof api>;
    mocked.signIn.mockRejectedValueOnce(new api.KashApiError('invalid_credentials', 'E-mail ou senha incorretos.')).mockResolvedValueOnce({ user: { id: 'u-1' } } as never);
    await renderWithTheme(<LoginScreen />);
    await fireEvent.changeText(screen.getByTestId('login-email'), 'lara@email.com');
    await fireEvent.changeText(screen.getByTestId('login-password'), 'errada123');
    await fireEvent.press(screen.getByTestId('login-submit'));
    await act(async () => {});
    expect(screen.getByTestId('login-error')).toBeOnTheScreen();
    expect(screen.getByTestId('login-password').props.value).toBe('');
    await fireEvent.changeText(screen.getByTestId('login-password'), '123456');
    await fireEvent.press(screen.getByTestId('login-submit'));
    await act(async () => {});
    expect(useKashStore.getState().auth).toBe('app');
  });
});
