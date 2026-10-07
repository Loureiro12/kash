import { act, fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as api from '@kash/supabase-client';
import { ProfileScreen } from '@/features/profile/ProfileScreen';
import { setClock } from '@/lib/clock';
import { useKashStore } from '@/store';
import { renderWithTheme } from '@/test/render';

jest.mock('@/data/source', () => ({ DATA_SOURCE: 'remote' }));

const mocked = api as jest.Mocked<typeof api>;
const sharing = Sharing as jest.Mocked<typeof Sharing>;
const written = (FileSystem as unknown as { __written: Record<string, string> }).__written;

beforeEach(() => {
  setClock(new Date(2026, 9, 6, 10));
  useKashStore.getState().reset();
  useKashStore.setState({ auth: 'app', userId: 'u-1' });
  jest.clearAllMocks();
});
afterAll(() => setClock(null));

describe('Exportar meus dados', () => {
  it('gera o JSON da RPC num arquivo datado e abre o compartilhamento', async () => {
    mocked.exportMyData.mockResolvedValueOnce({ format: 'kash-export/1', accounts: [{ name: 'Conta corrente' }] } as never);
    await renderWithTheme(<ProfileScreen />);
    await fireEvent.press(screen.getByTestId('profile-export'));
    await act(async () => {});
    const uri = 'file:///cache/kash-export-2026-10-06.json';
    expect(JSON.parse(written[uri]!)).toMatchObject({ format: 'kash-export/1', accounts: [{ name: 'Conta corrente' }] });
    expect(sharing.shareAsync).toHaveBeenCalledWith(uri, expect.objectContaining({ mimeType: 'application/json' }));
    expect(useKashStore.getState().ui.toast).toBe('Arquivo pronto pra compartilhar');
  });

  it('erro da API vira toast e nada é compartilhado', async () => {
    mocked.exportMyData.mockRejectedValueOnce(new api.KashApiError('network', 'Sem conexão. Tenta de novo.'));
    await renderWithTheme(<ProfileScreen />);
    await fireEvent.press(screen.getByTestId('profile-export'));
    await act(async () => {});
    expect(sharing.shareAsync).not.toHaveBeenCalled();
    expect(useKashStore.getState().ui.toast).toBe('Sem conexão. Tenta de novo.');
  });
});
