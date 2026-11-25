import { askAssistant, toKashError } from '@kash/supabase-client';
import { ASSISTANT_LIMITS, buildAssistantContext } from '@kash/domain';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createId } from '@/lib/ids';
import { now } from '@/lib/clock';
import { supabase } from '@/services/supabase';
import { track } from '@/services/telemetry';
import { useKashStore } from '@/store';
import { loadChat, saveChat, type ChatMessage } from './chatStorage';

/** resumo dos dados atuais da pessoa (montado na hora de cada pergunta, com o que está no app) */
function currentContext(): string {
  const s = useKashStore.getState();
  return buildAssistantContext({ user: s.user, settings: s.settings, accounts: s.accounts, cards: s.cards, txs: s.txs, plans: s.plans, bills: s.bills, goals: s.goals, invoices: s.invoices }, now());
}

/**
 * Conversa com o assistente (Claude, pela Edge Function `assistant`): envia as mensagens mais
 * recentes e o resumo financeiro, guarda a conversa neste aparelho e trata erro e limite diário.
 */
export function useAssistantChat() {
  const userId = useKashStore((s) => s.userId) ?? 'anon';
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const latest = useRef<ChatMessage[]>([]);

  useEffect(() => {
    let alive = true;
    void loadChat(userId).then((saved) => {
      if (!alive) return;
      latest.current = saved;
      setMessages(saved);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [userId]);

  const update = useCallback(
    (next: ChatMessage[]) => {
      latest.current = next;
      setMessages(next);
      void saveChat(userId, next);
    },
    [userId],
  );

  const request = useCallback(
    async (history: ChatMessage[]) => {
      setSending(true);
      setError(null);
      try {
        const turns = history.slice(-ASSISTANT_LIMITS.history).map((m) => ({ role: m.role, content: m.content }));
        const res = await askAssistant(supabase, { messages: turns, context: currentContext() });
        setRemaining(res.remaining);
        update([...latest.current, { id: createId('msg'), role: 'assistant', content: res.reply }]);
      } catch (err) {
        setError(toKashError(err).message);
      } finally {
        setSending(false);
      }
    },
    [update],
  );

  const send = useCallback(
    async (text: string, suggested = false) => {
      const content = text.trim().slice(0, ASSISTANT_LIMITS.messageChars);
      if (!content || sending) return;
      const next = [...latest.current, { id: createId('msg'), role: 'user' as const, content }];
      update(next);
      track('assistant_message', { suggested });
      await request(next);
    },
    [request, sending, update],
  );

  /** reenvia a última pergunta que ficou sem resposta */
  const retry = useCallback(async () => {
    const history = latest.current;
    if (sending || history[history.length - 1]?.role !== 'user') return;
    await request(history);
  }, [request, sending]);

  const reset = useCallback(() => {
    setError(null);
    update([]);
  }, [update]);

  return { messages, loaded, sending, error, remaining, send, retry, reset };
}
