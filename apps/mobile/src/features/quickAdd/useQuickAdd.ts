import { useEffect } from 'react';
import { AppState } from 'react-native';
import { track } from '@/services/telemetry';
import { useKashStore } from '@/store';
import { takePendingShortcut, watchPendingShortcut } from './quickAdd';

/**
 * Área logada: recebe os pedidos de lançamento rápido (atalhos do iPhone e o link `…://lancar`)
 * e abre o sheet "Lançar" no tipo pedido, só com o app desbloqueado (Face ID antes, se ligado).
 */
export function useQuickAdd() {
  const requestQuickAdd = useKashStore((s) => s.requestQuickAdd);
  const openNewTransaction = useKashStore((s) => s.openNewTransaction);
  const pending = useKashStore((s) => s.ui.quickAdd);
  const locked = useKashStore((s) => s.locked);

  // atalho do iPhone: na abertura, ao voltar para o app e com o app já aberto
  useEffect(() => {
    const check = () => {
      const kind = takePendingShortcut();
      if (!kind) return;
      track('quick_add', { kind, via: 'shortcut' });
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
    if (!pending || locked) return;
    requestQuickAdd(null);
    openNewTransaction(pending);
  }, [pending, locked, requestQuickAdd, openNewTransaction]);
}
