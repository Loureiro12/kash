import { askAssistant, toKashError, type AssistantImage } from '@kash/supabase-client';
import { ASSISTANT_LIMITS, assistantLedger, buildAssistantContext, checkProposal, describeProposal, toISODate, type AssistantLedger, type TxProposal } from '@kash/domain';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createId } from '@/lib/ids';
import { now } from '@/lib/clock';
import { supabase } from '@/services/supabase';
import { track } from '@/services/telemetry';
import { useKashStore } from '@/store';
import { loadChat, saveChat, type ChatMessage, type ProposalStatus } from './chatStorage';

/** resumo dos dados atuais da pessoa (montado na hora de cada pergunta, com o que está no app) */
export function currentContext(): string {
  const s = useKashStore.getState();
  return buildAssistantContext({ user: s.user, settings: s.settings, accounts: s.accounts, cards: s.cards, txs: s.txs, plans: s.plans, bills: s.bills, goals: s.goals, invoices: s.invoices }, now());
}

/** onde dá pra lançar agora: categorias e contas/cartões (sem números de cartão) */
export function currentLedger(): AssistantLedger {
  const s = useKashStore.getState();
  return assistantLedger(s.categories, s.cards, s.accounts);
}

const STATUS_NOTE: Record<ProposalStatus, string> = {
  pending: 'aguardando a pessoa confirmar',
  saved: 'a pessoa lançou',
  edited: 'a pessoa abriu para editar',
  dismissed: 'a pessoa descartou',
};

/** o que vai no histórico: o texto e, para o assistente saber, o que foi proposto e o que a pessoa fez */
function toTurn(m: ChatMessage, ledger: AssistantLedger) {
  const notes = (m.proposals ?? []).map((p) => `[Proposta: ${describeProposal(p.proposal, ledger)} — ${STATUS_NOTE[p.status]}]`);
  return { role: m.role, content: [m.photo ? '[A pessoa anexou uma foto]' : '', m.content, ...notes].filter(Boolean).join('\n') };
}

/** texto que acompanha uma foto enviada sem mensagem */
export const PHOTO_DEFAULT_TEXT = 'Lança esse comprovante pra mim.';

/**
 * Conversa com o assistente (Claude, pela Edge Function `assistant`): envia as mensagens mais
 * recentes, o resumo financeiro e as opções de lançamento; guarda a conversa neste aparelho; trata
 * erro e limite diário; e cuida dos lançamentos propostos (lançar, editar no sheet, descartar).
 */
export function useAssistantChat() {
  const userId = useKashStore((s) => s.userId) ?? 'anon';
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const latest = useRef<ChatMessage[]>([]);
  /** foto da última pergunta, guardada só na memória para o "Tentar de novo" */
  const pendingImage = useRef<AssistantImage | null>(null);

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
    async (history: ChatMessage[], image?: AssistantImage | null) => {
      setSending(true);
      setError(null);
      try {
        const ledger = currentLedger();
        const turns = history.slice(-ASSISTANT_LIMITS.history).map((m) => toTurn(m, ledger));
        const res = await askAssistant(supabase, { messages: turns, context: currentContext(), ledger, ...(image ? { image } : {}) });
        pendingImage.current = null;
        setRemaining(res.remaining);
        // confere cada proposta contra os dados de agora (conta excluída, categoria renomeada…)
        const today = toISODate(now());
        const proposals = (res.proposals ?? []).map((p) => checkProposal(p, ledger, today)).filter((p): p is TxProposal => p !== null);
        if (proposals.length) track('assistant_proposal', { action: 'shown' });
        update([...latest.current, { id: createId('msg'), role: 'assistant', content: res.reply, ...(proposals.length ? { proposals: proposals.map((proposal) => ({ proposal, status: 'pending' as const })) } : {}) }]);
      } catch (err) {
        setError(toKashError(err).message);
      } finally {
        setSending(false);
      }
    },
    [update],
  );

  const send = useCallback(
    async (text: string, suggested = false, image?: AssistantImage | null) => {
      const content = (text.trim() || (image ? PHOTO_DEFAULT_TEXT : '')).slice(0, ASSISTANT_LIMITS.messageChars);
      if (!content || sending) return;
      const next = [...latest.current, { id: createId('msg'), role: 'user' as const, content, ...(image ? { photo: true } : {}) }];
      update(next);
      track('assistant_message', image ? { suggested, photo: true } : { suggested });
      pendingImage.current = image ?? null;
      await request(next, image);
    },
    [request, sending, update],
  );

  /** reenvia a última pergunta que ficou sem resposta */
  const retry = useCallback(async () => {
    const history = latest.current;
    const last = history[history.length - 1];
    if (sending || last?.role !== 'user') return;
    // a foto só existe na memória: depois de fechar o app, reenvia só o texto
    await request(history, last.photo ? pendingImage.current : null);
  }, [request, sending]);

  const reset = useCallback(() => {
    setError(null);
    pendingImage.current = null;
    update([]);
  }, [update]);

  const setStatus = useCallback(
    (messageId: string, index: number, status: ProposalStatus) => {
      update(latest.current.map((m) => (m.id === messageId && m.proposals ? { ...m, proposals: m.proposals.map((p, i) => (i === index ? { ...p, status } : p)) } : m)));
      track('assistant_proposal', { action: status === 'saved' ? 'saved' : status === 'edited' ? 'edited' : 'dismissed' });
    },
    [update],
  );

  /** "Lançar": confere de novo e cria o lançamento como o sheet faria */
  const confirmProposal = useCallback(
    (messageId: string, index: number) => {
      const item = latest.current.find((m) => m.id === messageId)?.proposals?.[index];
      if (!item || item.status !== 'pending') return false;
      const p = checkProposal(item.proposal, currentLedger(), toISODate(now()));
      if (!p) {
        useKashStore.getState().showToast('Essa conta ou cartão não existe mais. Toque em Editar pra escolher outro.');
        return false;
      }
      useKashStore.getState().addTransaction({ kind: p.kind, amountCents: Math.round(p.amount * 100), category: p.category, sourceId: p.sourceId, note: p.title, installments: p.installments, date: p.date });
      setStatus(messageId, index, 'saved');
      return true;
    },
    [setStatus],
  );

  /** "Editar": abre o sheet de lançamento já preenchido (a pessoa salva por lá) */
  const editProposal = useCallback(
    (messageId: string, index: number) => {
      const item = latest.current.find((m) => m.id === messageId)?.proposals?.[index];
      if (!item || item.status !== 'pending') return;
      const p = item.proposal;
      useKashStore.getState().openNewTransaction(p.kind, { amountCents: Math.round(p.amount * 100), category: p.category, sourceId: p.sourceId, note: p.title, date: p.date, installments: p.installments });
      setStatus(messageId, index, 'edited');
    },
    [setStatus],
  );

  const dismissProposal = useCallback((messageId: string, index: number) => setStatus(messageId, index, 'dismissed'), [setStatus]);

  return { messages, loaded, sending, error, remaining, send, retry, reset, confirmProposal, editProposal, dismissProposal };
}
