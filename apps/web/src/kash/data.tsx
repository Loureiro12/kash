'use client';

import { ensureRollover, loadSnapshot, type KashSnapshot } from '@kash/supabase-client';
import { monthKey } from '@kash/domain';
import { QueryClient, useQuery } from '@tanstack/react-query';
import { createContext, useContext } from 'react';
import { requireKashClient } from './client';

export const queryKeys = {
  snapshotRoot: ['snapshot'] as const,
  snapshot: (userId: string) => ['snapshot', userId] as const,
};

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true },
      mutations: { retry: 0 },
    },
  });
}

/** mês em que a virada já foi pedida nesta aba (a RPC é idempotente; isto só evita chamadas repetidas) */
let rolledOverMonth: string | null = null;

/**
 * Snapshot do usuário logado. Na primeira leitura do mês processa a virada no servidor
 * (fecha faturas, lança parcelas e reabre contas fixas) antes de ler.
 */
async function fetchSnapshot(): Promise<KashSnapshot> {
  const db = requireKashClient();
  const month = monthKey(new Date());
  if (rolledOverMonth !== month) {
    try {
      await ensureRollover(db);
      rolledOverMonth = month;
    } catch {
      // sem virada agora: a próxima leitura tenta de novo; os dados continuam válidos
    }
  }
  return loadSnapshot(db);
}

export function useSnapshotQuery(userId: string | null) {
  return useQuery({ queryKey: queryKeys.snapshot(userId ?? 'anon'), queryFn: fetchSnapshot, enabled: !!userId });
}

/** Só para testes. */
export function __resetRolloverForTests() {
  rolledOverMonth = null;
}

const KashDataContext = createContext<KashSnapshot | null>(null);

/** Disponibiliza o snapshot carregado para as telas (o AppShell só renderiza as telas com dados). */
export const KashDataProvider = KashDataContext.Provider;

/** Dados do usuário logado. Use dentro do app (abaixo do AppShell). */
export function useKash(): KashSnapshot {
  const data = useContext(KashDataContext);
  if (!data) throw new Error('useKash fora do AppShell');
  return data;
}
