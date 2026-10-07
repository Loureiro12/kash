import { loadSnapshot } from '@kash/supabase-client';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { useKashStore } from '@/store';
import { queryKeys } from './keys';

import { DATA_SOURCE } from './source';

/**
 * Sincroniza o store com o servidor: uma query carrega o snapshot do usuário e hidrata o Zustand,
 * que continua sendo a cache normalizada que as telas consomem. Loading/erro viram `ui.dataStatus`.
 * Com EXPO_PUBLIC_DATA_SOURCE=seed o app segue com os dados de demonstração (sem rede).
 */

export function useServerSync(userId: string | null) {
  const hydrate = useKashStore((s) => s.hydrateFromServer);
  const setDataStatus = useKashStore((s) => s.setDataStatus);
  const enabled = DATA_SOURCE === 'remote' && !!userId;

  const query = useQuery({
    queryKey: queryKeys.snapshot(userId ?? 'anon'),
    queryFn: () => loadSnapshot(supabase),
    enabled,
  });

  useEffect(() => {
    if (!enabled) return;
    if (query.data) hydrate(query.data);
  }, [enabled, query.data, hydrate]);

  useEffect(() => {
    if (!enabled) return;
    // com dados (mesmo da cache persistida) a tela mostra conteúdo; erro só sem nada para mostrar
    if (query.data) setDataStatus('ready');
    else if (query.isError) setDataStatus('error');
    else setDataStatus('loading');
  }, [enabled, query.data, query.isError, query.isPending, setDataStatus]);

  return { refetch: query.refetch, isFetching: query.isFetching };
}
