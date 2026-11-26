import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TxProposal } from '@kash/domain';

/**
 * A conversa com o assistente fica só neste aparelho (o servidor não guarda nada): a última conversa
 * de cada pessoa, para continuar de onde parou. "Nova conversa" apaga.
 */
export type ProposalStatus = 'pending' | 'saved' | 'edited' | 'dismissed';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** a pessoa anexou uma foto (a imagem em si não é guardada) */
  photo?: boolean;
  /** lançamentos propostos pelo assistente nesta resposta */
  proposals?: { proposal: TxProposal; status: ProposalStatus }[];
}

const MAX_SAVED = 40;
const chatKey = (userId: string) => `kash.assistant.chat.${userId}`;
const CONSENT_KEY = 'kash.assistant.consent';

export async function loadChat(userId: string): Promise<ChatMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(chatKey(userId));
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as ChatMessage[]).filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string') : [];
  } catch {
    return [];
  }
}

export async function saveChat(userId: string, messages: ChatMessage[]): Promise<void> {
  try {
    if (messages.length === 0) await AsyncStorage.removeItem(chatKey(userId));
    else await AsyncStorage.setItem(chatKey(userId), JSON.stringify(messages.slice(-MAX_SAVED)));
  } catch {
    // sem espaço/armazenamento: a conversa só não fica salva
  }
}

/** autorização para enviar o resumo financeiro à Anthropic (Claude), pedida na primeira vez */
export const assistantConsent = {
  async get(): Promise<boolean> {
    try {
      return (await AsyncStorage.getItem(CONSENT_KEY)) === '1';
    } catch {
      return false;
    }
  },
  async set(on: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(CONSENT_KEY, on ? '1' : '0');
    } catch {
      // ignora: pede de novo na próxima vez
    }
  },
};
