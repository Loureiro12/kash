'use client';

import { subscribeToUserChanges } from '@kash/supabase-client';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getKashClient } from './client';
import { queryKeys } from './data';

/** junta rajadas de avisos (ex.: parcelado = plano + lançamento) num único recarregamento */
export const REALTIME_DEBOUNCE_MS = 400;

/**
 * Tempo real: escritas feitas em qualquer aparelho (app, outra aba, servidor) chegam pelo canal
 * privado do usuário e o snapshot é refeito. Ao reconectar, recarrega para pegar o que passou.
 */
export function useRealtimeSync(userId: string | null) {
  const qc = useQueryClient();
  useEffect(() => {
    const db = getKashClient();
    if (!userId || !db) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void qc.invalidateQueries({ queryKey: queryKeys.snapshotRoot }), REALTIME_DEBOUNCE_MS);
    };
    const stop = subscribeToUserChanges(db, userId, {
      onChange: refresh,
      onSubscribed: (isReconnect) => {
        if (isReconnect) refresh();
      },
    });
    return () => {
      clearTimeout(timer);
      stop();
    };
  }, [userId, qc]);
}
