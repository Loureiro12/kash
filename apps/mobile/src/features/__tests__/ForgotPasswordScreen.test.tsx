import { act, fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import * as api from '@kash/supabase-client';
import { ForgotPasswordScreen } from '@/features/auth/ForgotPasswordScreen';
import { useKashStore } from '@/store';
import { renderWithTheme } from '@/test/render';

const mocked = api as jest.Mocked<typeof api>;

beforeEach(() => {
  useKashStore.getState().reset();
  useKashStore.getState().start();
  jest.clearAllMocks();
});

async function sendTo(email: string) {
  await renderWithTheme(<ForgotPasswordScreen />);
  await fireEvent.changeText(screen.getByTestId('forgot-email'), email);
  await fireEvent.press(screen.getByTestId('forgot-submit'));
  await act(async () => {});
}

describe('Esqueci a senha por código', () => {
  it('envia o código e só libera "Confirmar" com 6 a 8 dígitos', async () => {
    await sendTo('lara@email.com');
    expect(mocked.requestPasswordReset).toHaveBeenCalledWith(expect.anything(), 'lara@email.com', 'kash://reset-password');
    expect(screen.getByTestId('forgot-sent')).toBeOnTheScreen();
    expect(screen.getByTestId('forgot-verify')).toBeDisabled();
    await fireEvent.changeText(screen.getByTestId('forgot-code'), '12a3 4');
    expect(screen.getByTestId('forgot-code').props.value).toBe('1234');
    expect(screen.getByTestId('forgot-verify')).toBeDisabled();
    await fireEvent.changeText(screen.getByTestId('forgot-code'), '123456');
    expect(screen.getByTestId('forgot-verify')).not.toBeDisabled();
  });

  it('código errado mostra erro; certo entra em recuperação', async () => {
    mocked.verifyRecoveryCode
      .mockRejectedValueOnce(new api.KashApiError('validation', 'Código inválido ou expirado. Confira ou peça um novo.'))
      .mockResolvedValueOnce({ user: { id: 'u-1' } } as never);
    await sendTo('lara@email.com');
    await fireEvent.changeText(screen.getByTestId('forgot-code'), '000000');
    await fireEvent.press(screen.getByTestId('forgot-verify'));
    await act(async () => {});
    expect(screen.getByTestId('forgot-error')).toHaveTextContent(/inválido ou expirado/);
    expect(useKashStore.getState().auth).toBe('login');

    await fireEvent.changeText(screen.getByTestId('forgot-code'), '482913');
    expect(screen.queryByTestId('forgot-error')).toBeNull();
    await fireEvent.press(screen.getByTestId('forgot-verify'));
    await act(async () => {});
    expect(mocked.verifyRecoveryCode).toHaveBeenLastCalledWith(expect.anything(), 'lara@email.com', '482913');
    expect(useKashStore.getState()).toMatchObject({ auth: 'recovery', userId: 'u-1' });
  });

  it('reenviar limpa o código e avisa', async () => {
    await sendTo('lara@email.com');
    await fireEvent.changeText(screen.getByTestId('forgot-code'), '123');
    await fireEvent.press(screen.getByTestId('forgot-resend'));
    await act(async () => {});
    expect(mocked.requestPasswordReset).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('forgot-code').props.value).toBe('');
    expect(useKashStore.getState().ui.toast).toBe('Enviamos um código novo');
  });
});
