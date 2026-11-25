import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import * as api from '@kash/supabase-client';
import { AssistantScreen } from '@/features/assistant/AssistantScreen';
import { splitBold } from '@/features/assistant/RichText';
import { HomeScreen } from '@/features/home/HomeScreen';
import { setClock } from '@/lib/clock';
import { useKashStore } from '@/store';
import { renderWithTheme } from '@/test/render';

jest.mock('@/data/source', () => ({ DATA_SOURCE: 'remote' }));
jest.mock('@/services/telemetry', () => ({ track: jest.fn() }));

const mockRouter = { push: jest.fn(), navigate: jest.fn(), replace: jest.fn(), back: jest.fn(), setParams: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, usePathname: () => '/assistant', useLocalSearchParams: () => ({}) }));

const mocked = api as jest.Mocked<typeof api>;
const { track } = jest.requireMock('@/services/telemetry') as { track: jest.Mock };

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  setClock(new Date(2026, 10, 25, 10));
  useKashStore.getState().reset();
  useKashStore.setState({ auth: 'app', userId: 'u-1' });
});
afterAll(() => setClock(null));

const press = (id: string) => fireEvent.press(screen.getByTestId(id));
const flush = () => act(async () => {});

async function openAccepted() {
  await AsyncStorage.setItem('kash.assistant.consent', '1');
  await renderWithTheme(<AssistantScreen />);
  await flush();
}

describe('Assistente Kash', () => {
  it('Início mostra o balão, que abre o assistente', async () => {
    await renderWithTheme(<HomeScreen />);
    await press('home-assistant-fab');
    expect(mockRouter.push).toHaveBeenCalledWith('/assistant');
  });

  it('primeira vez: explica o que vai para a IA e só abre o chat depois de aceitar', async () => {
    await renderWithTheme(<AssistantScreen />);
    await flush();
    expect(screen.getByTestId('assistant-consent')).toHaveTextContent(/Anthropic.*Não enviamos seu e-mail/);
    expect(screen.queryByTestId('assistant-input')).toBeNull();
    await press('assistant-consent-accept');
    await flush();
    expect(screen.getByTestId('assistant-empty')).toBeOnTheScreen();
    expect(await AsyncStorage.getItem('kash.assistant.consent')).toBe('1');
  });

  it('sugestão: envia a pergunta com o resumo financeiro e mostra a resposta formatada', async () => {
    mocked.askAssistant.mockResolvedValueOnce({ reply: 'Dá sim.\n- Sobram **R$ 600,00** no mês\n- Parcela cabe no limite', remaining: 39 });
    await openAccepted();
    await press('assistant-suggestion-1');
    await flush();

    const [, input] = mocked.askAssistant.mock.calls[0]!;
    expect(input.messages).toEqual([{ role: 'user', content: 'Vale a pena comprar um celular de R$ 2.000 em 10x?' }]);
    expect(input.context).toContain('## Contas');
    expect(input.context).toContain('Nome: Lara.');
    expect(input.context).not.toContain(useKashStore.getState().user.email);
    expect(track).toHaveBeenCalledWith('assistant_message', { suggested: true });

    expect(screen.getByTestId('assistant-msg-0')).toHaveTextContent(/^Vale a pena comprar/);
    expect(screen.getByTestId('assistant-msg-1')).toHaveTextContent(/Dá sim\..*Sobram R\$ 600,00 no mês/);
    // a conversa fica salva neste aparelho
    expect(JSON.parse((await AsyncStorage.getItem('kash.assistant.chat.u-1'))!)).toHaveLength(2);
  });

  it('pergunta digitada continua a conversa (histórico vai junto) e "Nova conversa" apaga', async () => {
    mocked.askAssistant.mockResolvedValueOnce({ reply: 'Primeira resposta', remaining: 39 }).mockResolvedValueOnce({ reply: 'Segunda resposta', remaining: 5 });
    await openAccepted();
    await fireEvent.changeText(screen.getByTestId('assistant-input'), 'Como estão meus gastos?');
    await press('assistant-send');
    await flush();
    await fireEvent.changeText(screen.getByTestId('assistant-input'), 'E na semana?');
    await press('assistant-send');
    await flush();
    expect(mocked.askAssistant.mock.calls[1]![1].messages.map((m) => m.content)).toEqual(['Como estão meus gastos?', 'Primeira resposta', 'E na semana?']);
    expect(screen.getByTestId('assistant-remaining')).toHaveTextContent('5 perguntas restantes hoje');

    await press('assistant-new');
    await flush();
    expect(screen.getByTestId('assistant-empty')).toBeOnTheScreen();
    expect(await AsyncStorage.getItem('kash.assistant.chat.u-1')).toBeNull();
  });

  it('erro: mostra a mensagem e "Tentar de novo" reenvia a mesma pergunta', async () => {
    mocked.askAssistant.mockRejectedValueOnce(new api.KashApiError('conflict', 'Você já fez as perguntas de hoje ao assistente. Volte amanhã!')).mockResolvedValueOnce({ reply: 'Agora foi', remaining: 1 });
    await openAccepted();
    await fireEvent.changeText(screen.getByTestId('assistant-input'), 'Onde economizo?');
    await press('assistant-send');
    await flush();
    expect(screen.getByTestId('assistant-error')).toHaveTextContent(/Volte amanhã!/);
    await press('assistant-retry');
    await flush();
    expect(mocked.askAssistant).toHaveBeenCalledTimes(2);
    expect(mocked.askAssistant.mock.calls[1]![1].messages).toEqual([{ role: 'user', content: 'Onde economizo?' }]);
    expect(screen.queryByTestId('assistant-error')).toBeNull();
    expect(screen.getByTestId('assistant-msg-1')).toHaveTextContent('Agora foi');
  });

  it('botão de enviar fica desligado sem texto', async () => {
    await openAccepted();
    expect(screen.getByTestId('assistant-send')).toBeDisabled();
  });
});

describe('texto do assistente', () => {
  it('separa o negrito', () => {
    expect(splitBold('Sobram **R$ 600** no **mês**.')).toEqual([
      { text: 'Sobram ', bold: false },
      { text: 'R$ 600', bold: true },
      { text: ' no ', bold: false },
      { text: 'mês', bold: true },
      { text: '.', bold: false },
    ]);
  });
});
