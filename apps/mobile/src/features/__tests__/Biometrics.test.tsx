import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as api from '@kash/supabase-client';
import React from 'react';
import { SecurityScreen } from '@/features/profile/security/SecurityScreen';
import { AppLock } from '@/features/security/AppLock';
import { biometricLabel } from '@/services/biometrics';
import { supabase } from '@/services/supabase';
import { useKashStore } from '@/store';
import { renderWithTheme } from '@/test/render';

const auth = LocalAuthentication as jest.Mocked<typeof LocalAuthentication>;
const st = () => useKashStore.getState();

beforeEach(async () => {
  jest.clearAllMocks();
  auth.hasHardwareAsync.mockResolvedValue(true);
  auth.isEnrolledAsync.mockResolvedValue(true);
  auth.supportedAuthenticationTypesAsync.mockResolvedValue([2]);
  auth.authenticateAsync.mockResolvedValue({ success: true });
  await AsyncStorage.clear();
  st().reset();
  useKashStore.setState({ auth: 'app', userId: 'u-1' });
});

describe('biometria — tela de Segurança', () => {
  it('nomeia o método por plataforma', () => {
    expect(biometricLabel('face', 'ios')).toBe('Face ID');
    expect(biometricLabel('fingerprint', 'ios')).toBe('Touch ID');
    expect(biometricLabel('fingerprint', 'android')).toBe('digital');
    expect(biometricLabel(null)).toBe('biometria');
  });

  it('ligar pede o Face ID; confirmado, grava neste aparelho e avisa', async () => {
    await renderWithTheme(<SecurityScreen />);
    await waitFor(() => expect(screen.getByText('Entrar com Face ID')).toBeOnTheScreen());
    await fireEvent.press(screen.getByTestId('security-biometrics-switch'));
    await act(async () => {});
    expect(auth.authenticateAsync).toHaveBeenCalledWith(expect.objectContaining({ promptMessage: 'Confirme para ativar o Face ID' }));
    expect(st().settings.biometrics).toBe(true);
    expect(await AsyncStorage.getItem('kash.biometricLock')).toBe('1');
    expect(st().ui.toast).toBe('Face ID ativado');
    // não vai para o servidor
    expect((api as jest.Mocked<typeof api>).updateSettings).not.toHaveBeenCalled();
  });

  it('cancelar o prompt não liga; sem cadastro explica e não pede', async () => {
    auth.authenticateAsync.mockResolvedValueOnce({ success: false, error: 'user_cancel' });
    await renderWithTheme(<SecurityScreen />);
    await waitFor(() => expect(screen.getByText('Entrar com Face ID')).toBeOnTheScreen());
    await fireEvent.press(screen.getByTestId('security-biometrics-switch'));
    await act(async () => {});
    expect(st().settings.biometrics).toBe(false);
    expect(st().ui.toast).toBeNull();
  });

  it('sem biometria cadastrada mostra o motivo e leva aos Ajustes', async () => {
    auth.isEnrolledAsync.mockResolvedValue(false);
    await renderWithTheme(<SecurityScreen />);
    await waitFor(() => expect(screen.getByText('Cadastre o Face ID nos Ajustes do aparelho pra usar')).toBeOnTheScreen());
    await fireEvent.press(screen.getByTestId('security-biometrics-switch'));
    await act(async () => {});
    expect(auth.authenticateAsync).not.toHaveBeenCalled();
    expect(st().ui.toast).toBe('Cadastre o Face ID nos Ajustes do aparelho primeiro');
  });
});

describe('biometria — bloqueio do app', () => {
  it('abre trancado quando a preferência está ligada; Face ID ok destranca', async () => {
    await AsyncStorage.setItem('kash.biometricLock', '1');
    (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({ data: { session: { user: { id: 'u-1' } } } });
    await act(async () => st().bootstrapAuth());
    expect(st()).toMatchObject({ auth: 'app', locked: true });
    expect(st().settings.biometrics).toBe(true);
    await renderWithTheme(<AppLock ready />);
    await waitFor(() => expect(auth.authenticateAsync).toHaveBeenCalledWith(expect.objectContaining({ promptMessage: 'Desbloquear o Kash' })));
    await waitFor(() => expect(st().locked).toBe(false));
  });

  it('falha mostra o motivo; "Entrar com senha" encerra a sessão', async () => {
    auth.authenticateAsync.mockResolvedValue({ success: false, error: 'lockout' });
    useKashStore.setState((s) => ({ locked: true, settings: { ...s.settings, biometrics: true } }));
    await renderWithTheme(<AppLock ready />);
    await waitFor(() => expect(screen.getByTestId('app-lock-error')).toHaveTextContent(/Muitas tentativas/));
    expect(st().locked).toBe(true);
    await fireEvent.press(screen.getByTestId('app-lock-password'));
    await act(async () => {});
    expect(st().auth).toBe('login');
    expect(await AsyncStorage.getItem('kash.biometricLock')).toBeNull();
  });

  it('sem a preferência, lock() não tranca e o servidor não sobrescreve a escolha local', async () => {
    await act(async () => st().lock());
    expect(st().locked).toBe(false);
    await act(async () => st().setBiometrics(true));
    const s = st();
    await act(async () =>
      st().hydrateFromServer({ user: s.user, settings: { ...s.settings, biometrics: false }, lastRolloverMonth: s.lastRolloverMonth, categories: s.categories, accounts: s.accounts, cards: s.cards, cardUsage: {}, txs: s.txs, plans: s.plans, bills: s.bills, goals: s.goals, invoices: s.invoices }),
    );
    expect(st().settings.biometrics).toBe(true);
  });
});
