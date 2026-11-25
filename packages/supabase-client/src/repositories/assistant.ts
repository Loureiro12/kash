import type { KashClient } from '../client';
import { KashApiError, toKashError } from '../errors';

export interface AssistantTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantReply {
  reply: string;
  /** perguntas que ainda restam hoje */
  remaining: number;
  /** o modelo recusou (a resposta é um texto padrão) */
  refused?: boolean;
  /** a resposta foi cortada pelo tamanho máximo */
  truncated?: boolean;
}

const ERRORS: Record<string, string> = {
  daily_limit: 'Você já fez as perguntas de hoje ao assistente. Volte amanhã!',
  ai_not_configured: 'O assistente ainda não está disponível.',
  ai_failed: 'O assistente não respondeu agora. Tente de novo em instantes.',
  invalid_messages: 'Não deu pra enviar essa mensagem. Tente reescrever.',
  context_too_long: 'Seus dados ficaram grandes demais para o assistente. Tente de novo mais tarde.',
  unauthorized: 'Entre de novo na sua conta para usar o assistente.',
};

/**
 * Pergunta ao assistente financeiro (Edge Function `assistant`, Claude). `context` é o resumo dos
 * dados da pessoa (`buildAssistantContext` de @kash/domain); a conversa não é guardada no servidor.
 */
export async function askAssistant(db: KashClient, input: { messages: AssistantTurn[]; context: string }): Promise<AssistantReply> {
  try {
    const { data, error } = await db.functions.invoke('assistant', { body: input });
    if (error) {
      const res = await (error as { context?: Response }).context?.json?.().catch(() => null);
      const code = (res as { error?: string } | null)?.error ?? '';
      throw new KashApiError(code === 'daily_limit' ? 'conflict' : code === 'unauthorized' ? 'unauthorized' : 'unknown', ERRORS[code] ?? ERRORS.ai_failed!, error);
    }
    return data as AssistantReply;
  } catch (err) {
    throw toKashError(err);
  }
}
