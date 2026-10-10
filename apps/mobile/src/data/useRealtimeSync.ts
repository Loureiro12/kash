import { subscribeToUserChanges } from '@kash/supabase-client';
import { useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { queryKeys } from './keys';
import { queryClient } from './queryClient';

/** junta rajadas de avisos (ex.: parcelado = plano + lançamento) num único recarregamento */
export const REALTIME_DEBOUNCE_MS = 400;

/**
 * Tempo real: escritas feitas em outro aparelho (web, outro celular, servidor) chegam pelo canal
 * privado do usuário e o snapshot é refeito (o store hidrata em seguida). Ao reconectar — por
 * exemplo, voltando do segundo plano — recarrega para pegar o que passou.
 */
export function useRealtimeSync(userId: string | null, enabled: boolean) {
  useEffect(() => {
    if (!enabled || !userId) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void queryClient.invalidateQueries({ queryKey: queryKeys.snapshotRoot }), REALTIME_DEBOUNCE_MS);
    };
    const stop = subscribeToUserChanges(supabase, userId, {
      onChange: refresh,
      onSubscribed: (isReconnect) => {
        if (isReconnect) refresh();
      },
    });
    return () => {
      clearTimeout(timer);
      if (typeof stop === 'function') stop();
    };
  }, [userId, enabled]);
}
