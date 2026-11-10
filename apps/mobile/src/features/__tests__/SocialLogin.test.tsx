import * as api from '@kash/supabase-client';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import { LoginScreen } from '@/features/auth/LoginScreen';
import { useKashStore } from '@/store';
import { renderWithTheme } from '@/test/render';

jest.mock('expo-crypto', () => ({
  randomUUID: () => 'nonce-original',
  digestStringAsync: async (_alg: string, value: string) => `sha256(${value})`,
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

const session = { user: { id: 'u-social', email: 'ana@icloud.com' }, access_token: 'a', refresh_token: 'r' };

beforeEach(() => {
  jest.clearAllMocks();
  useKashStore.getState().reset();
  useKashStore.setState({ auth: 'login', userId: null });
});

describe('Entrar com Apple e Google', () => {
  it('Apple no iPhone: folha nativa com nonce em hash; o nome vai para o perfil', async () => {
    (AppleAuthentication.signInAsync as jest.Mock).mockResolvedValueOnce({ identityToken: 'apple-jwt', fullName: { givenName: 'Ana', familyName: 'Souza' } });
    (api.signInWithAppleIdToken as jest.Mock).mockResolvedValueOnce(session);
    await renderWithTheme(<LoginScreen />);
    await waitFor(() => expect(screen.getByTestId('auth-apple')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('auth-apple'));
    await waitFor(() => expect(useKashStore.getState().auth).toBe('app'));

    const asked = (AppleAuthentication.signInAsync as jest.Mock).mock.calls[0]![0] as { nonce: string };
    const sent = (api.signInWithAppleIdToken as jest.Mock).mock.calls[0]![1] as { token: string; nonce: string; fullName: string };
    expect(sent).toMatchObject({ token: 'apple-jwt', fullName: 'Ana Souza' });
    // a Apple recebe o hash; o Supabase recebe o valor original
    expect([asked.nonce, sent.nonce]).toEqual(['sha256(nonce-original)', 'nonce-original']);
    expect(useKashStore.getState().userId).toBe('u-social');
  });

  it('cancelar a Apple não mostra erro', async () => {
    (AppleAuthentication.signInAsync as jest.Mock).mockRejectedValueOnce(Object.assign(new Error('canceled'), { code: 'ERR_REQUEST_CANCELED' }));
    await renderWithTheme(<LoginScreen />);
    await waitFor(() => expect(screen.getByTestId('auth-apple')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('auth-apple'));
    await waitFor(() => expect(useKashStore.getState().authRequest).toEqual({ status: 'idle', error: null }));
    expect(useKashStore.getState().auth).toBe('login');
    expect(screen.queryByTestId('login-error')).toBeNull();
  });

  it('Google pelo navegador do sistema: volta para kash://auth-callback e abre a sessão', async () => {
    (api.socialSignInUrl as jest.Mock).mockResolvedValueOnce('https://x.supabase.co/auth/v1/authorize?provider=google');
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValueOnce({ type: 'success', url: 'kash://auth-callback#access_token=a&refresh_token=r' });
    (api.sessionFromOAuthRedirect as jest.Mock).mockResolvedValueOnce(session);
    await renderWithTheme(<LoginScreen />);
    await fireEvent.press(screen.getByTestId('auth-google'));
    await waitFor(() => expect(useKashStore.getState().auth).toBe('app'));
    expect(api.socialSignInUrl).toHaveBeenCalledWith(expect.anything(), 'google', 'kash://auth-callback');
    expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalledWith('https://x.supabase.co/auth/v1/authorize?provider=google', 'kash://auth-callback');
  });

  it('erro do provedor aparece na tela de login', async () => {
    (api.socialSignInUrl as jest.Mock).mockRejectedValueOnce(new api.KashApiError('network', 'Sem conexão. Confira a internet.'));
    await renderWithTheme(<LoginScreen />);
    await fireEvent.press(screen.getByTestId('auth-google'));
    await waitFor(() => expect(screen.getByTestId('login-error')).toHaveTextContent('Sem conexão. Confira a internet.'));
  });

  it('retorno que chega como deep link (Android) também abre a sessão', async () => {
    (api.sessionFromOAuthRedirect as jest.Mock).mockResolvedValueOnce(session);
    expect(await useKashStore.getState().handleAuthUrl('kash://auth-callback#access_token=a&refresh_token=r')).toBe(true);
    expect(useKashStore.getState().auth).toBe('app');
  });
});
