import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import { ProfileScreen } from '@/features/profile/ProfileScreen';
import { useKashStore } from '@/store';
import { renderWithTheme } from '@/test/render';

// no Jest o expo-constants não traz o app.json; no aparelho, expoConfig vem do build/update
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: jest.requireActual('../../../app.json').expo.version } } }));

beforeEach(() => {
  useKashStore.getState().reset();
  useKashStore.setState({ auth: 'app', userId: 'u-1' });
});

describe('Lembrete por e-mail (Perfil)', () => {
  it('começa desligado; ligar mostra para qual e-mail vai e desligar volta', async () => {
    await renderWithTheme(<ProfileScreen />);
    const email = useKashStore.getState().user.email;
    expect(screen.getByTestId('profile-email-reminder-switch').props.accessibilityState).toMatchObject({ checked: false });
    expect(screen.getByText('E-mail às 9h, 2 dias antes do vencimento')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('profile-email-reminder'));
    expect(useKashStore.getState().settings.emailReminder).toBe(true);
    expect(useKashStore.getState().ui.toast).toBe(`Lembretes por e-mail ligados: chegam às 9h em ${email}`);
    expect(screen.getByText(`Às 9h em ${email}`)).toBeTruthy();

    await fireEvent.press(screen.getByTestId('profile-email-reminder'));
    expect(useKashStore.getState().settings.emailReminder).toBe(false);
    expect(useKashStore.getState().ui.toast).toBe('Lembretes por e-mail desligados');
  });

  it('é independente do push', async () => {
    await renderWithTheme(<ProfileScreen />);
    const before = useKashStore.getState().settings.billReminder;
    await fireEvent.press(screen.getByTestId('profile-email-reminder'));
    expect(useKashStore.getState().settings.billReminder).toBe(before);
  });
});

describe('Versão no Perfil', () => {
  it('vem do app.json (não fica escrita à mão)', async () => {
    await renderWithTheme(<ProfileScreen />);
    const { version } = require('../../../app.json').expo as { version: string };
    expect(screen.getByText(version)).toBeTruthy();
  });
});
