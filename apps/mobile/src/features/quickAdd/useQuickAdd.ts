import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { track } from '@/services/telemetry';
import { assistantConsent } from '../assistant/chatStorage';
import { useKashStore } from '@/store';
import { takePendingShortcut, watchPendingShortcut } from './quickAdd';

/**
 * Área logada: recebe os pedidos de lançamento rápido (atalhos do iPhone e o link `…://lancar`)
 * e abre o sheet "Lançar" no tipo pedido (ou o assistente), só com o app desbloqueado (Face ID antes, se ligado)
 * e com os dados do servidor já carregados.
 */
export function useQuickAdd() {
  const router = useRouter();
  const requestQuickAdd = useKashStore((s) => s.requestQuickAdd);
  const openNewTransaction = useKashStore((s) => s.openNewTransaction);
  const openQuickEntry = useKashStore((s) => s.openQuickEntry);
  const pending = useKashStore((s) => s.ui.quickAdd);
  const locked = useKashStore((s) => s.locked);
  // com os dados ainda carregando, o sheet mostraria contas de exemplo: espera o snapshot
  const ready = useKashStore((s) => s.ui.dataStatus === 'ready');

  // atalho do iPhone: na abertura, ao voltar para o app e com o app já aberto
  useEffect(() => {
    const check = () => {
      const kind = takePendingShortcut();
      if (!kind) return;
      if (kind !== 'assistant') track('quick_add', { kind: typeof kind === 'object' ? 'text' : kind, via: 'shortcut' });
      requestQuickAdd(kind);
    };
    check();
    const stopWatch = watchPendingShortcut(check);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => {
      stopWatch();
      sub.remove();
    };
  }, [requestQuickAdd]);

  useEffect(() => {
    if (!pending || locked || !ready) return;
    requestQuickAdd(null);
    // "Perguntar ao Kash" (Atalhos, Siri, botão de Ação): abre o assistente
    if (pending === 'assistant') router.push('/assistant');
    else if (typeof pending === 'object') {
      // "Lançar no Kash" (Siri): confirmação direta; sem a autorização da IA ainda, o assistente pede antes
      const text = pending.text;
      void assistantConsent.get().then((ok) => (ok ? openQuickEntry(text) : router.push({ pathname: '/assistant', params: { texto: text } })));
    } else openNewTransaction(pending);
  }, [pending, locked, ready, requestQuickAdd, openNewTransaction, openQuickEntry, router]);
}
