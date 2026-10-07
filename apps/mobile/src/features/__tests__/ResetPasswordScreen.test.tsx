import { act, fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import * as api from '@kash/supabase-client';
import { ResetPasswordScreen } from '@/features/auth/ResetPasswordScreen';
import { useKashStore } from '@/store';
import { renderWithTheme } from '@/test/render';

const mocked = api as jest.Mocked<typeof api>;

beforeEach(() => {
  useKashStore.getState().reset();
  useKashStore.getState().start();
  jest.clearAllMocks();
});

describe('recuperação de senha', () => {
  it('deep link válido leva ao estado recovery; outros links são ignorados', async () => {
    mocked.recoverSessionFromUrl.mockResolvedValueOnce(null).mockResolvedValueOnce({ user: { id: 'u-1' } } as never);
    expect(await useKashStore.getState().handleAuthUrl('kash://outra')).toBe(false);
    expect(useKashStore.getState().auth).toBe('login');
    expect(await useKashStore.getState().handleAuthUrl('kash://reset-password?token_hash=abc&type=recovery')).toBe(true);
    expect(useKashStore.getState()).toMatchObject({ auth: 'recovery', userId: 'u-1' });
  });

  it('link expirado mostra toast e não muda o estado', async () => {
    mocked.recoverSessionFromUrl.mockRejectedValueOnce(new api.KashApiError('validation', 'Esse link expirou ou já foi usado. Peça um novo.'));
    expect(await useKashStore.getState().handleAuthUrl('kash://reset-password#error=access_denied')).toBe(false);
    expect(useKashStore.getState().auth).toBe('login');
    expect(useKashStore.getState().ui.toast).toMatch(/expirou/);
  });

  it('tela valida, grava a nova senha e entra no app; erro do servidor aparece', async () => {
    useKashStore.setState({ auth: 'recovery', userId: 'u-1' });
    await renderWithTheme(<ResetPasswordScreen />);
    await fireEvent.press(screen.getByTestId('reset-submit'));
    expect(screen.getByText('Pelo menos 6 caracteres.')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId('reset-password'), 'novasenha1');
    await fireEvent.changeText(screen.getByTestId('reset-confirm'), 'outra');
    await fireEvent.press(screen.getByTestId('reset-submit'));
    expect(screen.getByText('As senhas não conferem.')).toBeOnTheScreen();
    expect(mocked.updatePassword).not.toHaveBeenCalled();

    mocked.updatePassword.mockRejectedValueOnce(new api.KashApiError('validation', 'A nova senha precisa ser diferente da atual.'));
    await fireEvent.changeText(screen.getByTestId('reset-confirm'), 'novasenha1');
    await fireEvent.press(screen.getByTestId('reset-submit'));
    await act(async () => {});
    expect(screen.getByTestId('reset-error')).toHaveTextContent(/diferente da atual/);
    expect(useKashStore.getState().auth).toBe('recovery');

    await fireEvent.press(screen.getByTestId('reset-submit'));
    await act(async () => {});
    expect(mocked.updatePassword).toHaveBeenLastCalledWith(expect.anything(), 'novasenha1');
    expect(useKashStore.getState().auth).toBe('app');
    expect(useKashStore.getState().ui.toast).toMatch(/Senha alterada/);
  });

  it('voltar pro login encerra a sessão de recuperação', async () => {
    useKashStore.setState({ auth: 'recovery', userId: 'u-1' });
    await renderWithTheme(<ResetPasswordScreen />);
    await fireEvent.press(screen.getByTestId('reset-cancel'));
    await act(async () => {});
    expect(mocked.signOut).toHaveBeenCalled();
    expect(useKashStore.getState().auth).toBe('login');
  });
});
