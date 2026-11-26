import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, screen } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import { Alert } from 'react-native';
import * as api from '@kash/supabase-client';
import { AssistantScreen } from '@/features/assistant/AssistantScreen';
import { PHOTO_DEFAULT_TEXT } from '@/features/assistant/useAssistantChat';
import { TransactionSheet } from '@/features/transactions/TransactionSheet';
import { setClock } from '@/lib/clock';
import { useKashStore } from '@/store';
import { renderWithTheme } from '@/test/render';

jest.mock('@/data/source', () => ({ DATA_SOURCE: 'remote' }));
jest.mock('@/services/telemetry', () => ({ track: jest.fn() }));

const mockRouter = { push: jest.fn(), navigate: jest.fn(), replace: jest.fn(), back: jest.fn(), setParams: jest.fn() };
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, usePathname: () => '/assistant', useLocalSearchParams: () => mockParams }));

const mocked = api as jest.Mocked<typeof api>;
const picker = ImagePicker as jest.Mocked<typeof ImagePicker>;
const { ImageManipulator } = jest.requireMock('expo-image-manipulator') as { ImageManipulator: { __ctx: { resize: jest.Mock } } };
const { track } = jest.requireMock('@/services/telemetry') as { track: jest.Mock };
const BASE64 = 'QUJD'.repeat(50);

/** responde ao Alert escolhendo o botão com esse texto */
const answerAlert = (label: string) =>
  jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
    buttons?.find((b) => b.text === label)?.onPress?.();
  });

beforeEach(async () => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  mockParams = {};
  await AsyncStorage.clear();
  await AsyncStorage.setItem('kash.assistant.consent', '1');
  setClock(new Date(2026, 10, 25, 10));
  useKashStore.getState().reset();
  useKashStore.setState({ auth: 'app', userId: 'u-1' });
});
afterAll(() => setClock(null));

const press = (id: string) => fireEvent.press(screen.getByTestId(id));
const flush = () => act(async () => {});

describe('Foto do comprovante → lançamento', () => {
  it('vindo do "Ler comprovante": abre a câmera, reduz a foto e envia sozinho; a proposta vira o cartão de Lançar', async () => {
    mockParams = { foto: 'camera' };
    const card = useKashStore.getState().cards[0]!;
    mocked.askAssistant.mockResolvedValueOnce({
      reply: 'Li **Padaria Pão Quente**, R$ 23,90, hoje. Confere e toque em Lançar.',
      remaining: 39,
      proposals: [{ kind: 'expense', amount: 23.9, title: 'Padaria Pão Quente', category: 'Comida', sourceId: card.id, date: '2026-11-25', installments: 1 }],
    });
    await renderWithTheme(<AssistantScreen />);
    await flush();
    await flush();

    expect(picker.launchCameraAsync).toHaveBeenCalled();
    // 3024×4032 → lado maior 1568
    expect(ImageManipulator.__ctx.resize).toHaveBeenCalledWith({ height: 1568 });
    const [, input] = mocked.askAssistant.mock.calls[0]!;
    expect(input.image).toEqual({ mediaType: 'image/jpeg', data: BASE64 });
    expect(input.messages.at(-1)!.content).toBe(`[A pessoa anexou uma foto]\n${PHOTO_DEFAULT_TEXT}`);
    expect(track).toHaveBeenCalledWith('assistant_message', { suggested: false, photo: true });

    expect(screen.getByTestId('assistant-msg-0-photo')).toBeOnTheScreen();
    await press('assistant-proposal-1-0-confirm');
    expect(useKashStore.getState().txs[0]).toMatchObject({ title: 'Padaria Pão Quente', amount: -23.9, sourceId: card.id });
    // a imagem não fica guardada no aparelho: só a marcação de que havia foto
    const saved = await AsyncStorage.getItem('kash.assistant.chat.u-1');
    expect(saved).not.toContain(BASE64);
    expect(JSON.parse(saved!)[0]).toMatchObject({ photo: true });
  });

  it('pelo botão de câmera do chat: escolhe da galeria, mostra a miniatura e envia junto com o texto', async () => {
    mocked.askAssistant.mockResolvedValueOnce({ reply: 'Confere e toque em Lançar.', remaining: 38 });
    await renderWithTheme(<AssistantScreen />);
    await flush();
    answerAlert('Escolher da galeria');
    await press('assistant-photo');
    await flush();
    expect(picker.launchImageLibraryAsync).toHaveBeenCalled();
    // 1200×900 já é pequena: não redimensiona
    expect(ImageManipulator.__ctx.resize).not.toHaveBeenCalled();
    expect(screen.getByTestId('assistant-photo-preview')).toHaveTextContent(/Foto do comprovante/);
    expect(mocked.askAssistant).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByTestId('assistant-input'), 'foi no Nubank em 3x');
    await press('assistant-send');
    await flush();
    const [, input] = mocked.askAssistant.mock.calls[0]!;
    expect(input.image?.data).toBe(BASE64);
    expect(input.messages.at(-1)!.content).toBe('[A pessoa anexou uma foto]\nfoi no Nubank em 3x');
    expect(screen.queryByTestId('assistant-photo-preview')).toBeNull();
  });

  it('remover a foto antes de enviar; câmera negada não envia nada e oferece os Ajustes', async () => {
    await renderWithTheme(<AssistantScreen />);
    await flush();
    answerAlert('Escolher da galeria');
    await press('assistant-photo');
    await flush();
    await press('assistant-photo-remove');
    expect(screen.queryByTestId('assistant-photo-preview')).toBeNull();
    expect(screen.getByTestId('assistant-send')).toBeDisabled();

    jest.restoreAllMocks();
    picker.requestCameraPermissionsAsync.mockResolvedValueOnce({ granted: false } as never);
    const alert = answerAlert('Tirar foto');
    await press('assistant-photo');
    await flush();
    expect(picker.launchCameraAsync).not.toHaveBeenCalled();
    expect(alert).toHaveBeenLastCalledWith('Sem acesso à câmera', expect.stringContaining('Ajustes'), expect.any(Array));
    expect(mocked.askAssistant).not.toHaveBeenCalled();
  });

  it('falhou o envio: "Tentar de novo" reenvia a mesma foto', async () => {
    mockParams = { foto: 'galeria' };
    mocked.askAssistant.mockRejectedValueOnce(new api.KashApiError('unknown', 'O assistente não respondeu agora. Tente de novo em instantes.'));
    mocked.askAssistant.mockResolvedValueOnce({ reply: 'Pronto.', remaining: 37 });
    await renderWithTheme(<AssistantScreen />);
    await flush();
    await flush();
    expect(screen.getByTestId('assistant-error')).toBeOnTheScreen();
    await press('assistant-retry');
    await flush();
    expect(mocked.askAssistant).toHaveBeenCalledTimes(2);
    expect(mocked.askAssistant.mock.calls[1]![1].image?.data).toBe(BASE64);
  });

  it('no lançamento: "Ler comprovante" fecha o sheet e abre o assistente na câmera', async () => {
    await act(async () => useKashStore.getState().openSheet('expense'));
    await renderWithTheme(<TransactionSheet />);
    answerAlert('Tirar foto');
    await press('expense-receipt');
    await flush();
    expect(useKashStore.getState().ui.sheet).toBeNull();
    expect(mockRouter.push).toHaveBeenCalledWith('/assistant?foto=camera');
  });
});
