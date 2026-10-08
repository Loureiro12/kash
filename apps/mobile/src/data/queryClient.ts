import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient, focusManager } from '@tanstack/react-query';
import { AppState, type AppStateStatus } from 'react-native';

/** Cliente de queries: dados do servidor ficam frescos por 1 min e sobrevivem por 7 dias no cache persistido. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 7 * 24 * 60 * 60 * 1000,
      retry: 1,
    },
  },
});

/** Cache persistida no AsyncStorage: o app abre com os últimos dados mesmo sem rede. */
export const queryPersister = createAsyncStoragePersister({ storage: AsyncStorage, key: 'kash.query-cache' });

/** Versão da cache: mude ao alterar o formato do snapshot para descartar caches antigas. */
export const QUERY_CACHE_BUSTER = 'v2-categories';

// "foco" no mobile = app em primeiro plano (refetch de queries stale ao voltar)
AppState.addEventListener('change', (status: AppStateStatus) => {
  focusManager.setFocused(status === 'active');
});
