import { act, fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import * as api from '@kash/supabase-client';
import { TransactionSheet } from '@/features/transactions/TransactionSheet';
import { setClock } from '@/lib/clock';
import { useKashStore } from '@/store';
import { renderWithTheme } from '@/test/render';

jest.mock('@/data/source', () => ({ DATA_SOURCE: 'remote' }));
jest.mock('@/services/telemetry', () => ({ track: jest.fn() }));
const mocked = api as jest.Mocked<typeof api>;
const answerAlert = (label: string) =>
  jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
    buttons?.find((b) => b.text === label)?.onPress?.();
  });

beforeEach(async () => {
  setClock(new Date(2026, 10, 28, 10));
  useKashStore.getState().reset();
  useKashStore.setState((s) => ({ auth: 'app', userId: 'u-1', ui: { ...s.ui, dataStatus: 'ready' } }));
  jest.restoreAllMocks();
  jest.clearAllMocks();
  mocked.attachmentUrl.mockResolvedValue('https://storage/receipt.jpg');
});
afterAll(() => setClock(null));

const press = (id: string) => fireEvent.press(screen.getByTestId(id));
const flush = () => act(async () => {});

describe('comprovante anexado', () => {
  it('novo lançamento não mostra; editando: anexa pela galeria, mostra a miniatura e remove', async () => {
    await act(() => useKashStore.getState().openSheet('expense'));
    await renderWithTheme(<TransactionSheet />);
    expect(screen.queryByTestId('attachment-add')).toBeNull();

    mocked.uploadAttachment.mockResolvedValueOnce('u-1/tx1/1.jpg');
    await act(() => useKashStore.getState().openTransaction('tx1'));
    await renderWithTheme(<TransactionSheet />);
    answerAlert('Escolher da galeria');
    await press('attachment-add');
    await flush();
    expect(mocked.uploadAttachment).toHaveBeenCalledWith(expect.anything(), 'tx1', 'QUJD'.repeat(50));
    expect(useKashStore.getState().txs.find((t) => t.id === 'tx1')?.attachmentPath).toBe('u-1/tx1/1.jpg');
    await flush();
    expect(screen.getByTestId('attachment')).toBeOnTheScreen();
    expect(mocked.attachmentUrl).toHaveBeenCalledWith(expect.anything(), 'u-1/tx1/1.jpg');

    jest.restoreAllMocks();
    answerAlert('Remover');
    await press('attachment-remove');
    await flush();
    expect(mocked.removeAttachment).toHaveBeenCalledWith(expect.anything(), 'tx1', 'u-1/tx1/1.jpg');
    expect(useKashStore.getState().txs.find((t) => t.id === 'tx1')?.attachmentPath).toBeUndefined();
  });
});
