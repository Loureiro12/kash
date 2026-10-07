import { act, fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import * as api from '@kash/supabase-client';
import { ChangePasswordSheet } from '@/features/profile/ChangePasswordSheet';
import { useKashStore } from '@/store';
import { renderWithTheme } from '@/test/render';

const mocked = api as jest.Mocked<typeof api>;

beforeEach(() => {
  useKashStore.getState().reset();
  useKashStore.setState({ auth: 'app', userId: 'u-1' });
  useKashStore.getState().openSheet('changePassword');
  jest.clearAllMocks();
});

async function fill(current: string, next: string) {
  await fireEvent.changeText(screen.getByTestId('cp-current'), current);
  await fireEvent.changeText(screen.getByTestId('cp-new'), next);
  await fireEvent.changeText(screen.getByTestId('cp-confirm'), next);
  await fireEvent.press(screen.getByTestId('cp-save'));
  await act(async () => {});
}

describe('ChangePasswordSheet', () => {
  it('senha atual errada mostra o erro do servidor e mantém o sheet aberto', async () => {
    mocked.changePassword.mockRejectedValueOnce(new api.KashApiError('invalid_credentials', 'Senha atual incorreta.'));
    await renderWithTheme(<ChangePasswordSheet />);
    await fill('errada', 'novasenha1');
    expect(mocked.changePassword).toHaveBeenCalledWith(expect.anything(), { currentPassword: 'errada', newPassword: 'novasenha1' });
    expect(screen.getByTestId('cp-error')).toHaveTextContent('Senha atual incorreta.');
    expect(useKashStore.getState().ui.sheet).toBe('changePassword');
  });

  it('sucesso fecha o sheet e avisa', async () => {
    await renderWithTheme(<ChangePasswordSheet />);
    await fill('123456', 'novasenha1');
    expect(useKashStore.getState().ui.sheet).toBeNull();
    expect(useKashStore.getState().ui.toast).toBe('Senha alterada');
  });
});
