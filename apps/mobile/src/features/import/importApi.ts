import * as api from '@kash/supabase-client';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/data/queryClient';
import { queryKeys } from '@/data/keys';
import { DATA_SOURCE } from '@/data/source';
import { supabase } from '@/services/supabase';
import type { ImportFormat, TargetType } from './readStatement';

/** chaves das listas da importação (fora do snapshot) */
export const importKeys = {
  rules: (userId: string) => ['merchant-rules', userId] as const,
  imports: (userId: string) => ['imports', userId] as const,
};

const remote = DATA_SOURCE === 'remote';

export function useMerchantRules(userId: string | null) {
  return useQuery({ queryKey: importKeys.rules(userId ?? 'anon'), queryFn: () => api.listMerchantRules(supabase), enabled: remote && !!userId });
}

export function useImportHistory(userId: string | null) {
  return useQuery({ queryKey: importKeys.imports(userId ?? 'anon'), queryFn: () => api.listImports(supabase), enabled: remote && !!userId });
}

async function refresh() {
  await Promise.all([queryClient.invalidateQueries({ queryKey: queryKeys.snapshotRoot }), queryClient.invalidateQueries({ queryKey: ['imports'] }), queryClient.invalidateQueries({ queryKey: ['merchant-rules'] })]);
}

export interface SaveImportInput {
  target: { type: TargetType; id: string };
  fileName: string;
  format: ImportFormat;
  statementMonth: string | null;
  items: Record<string, unknown>[];
  keepBalance: boolean;
}

/** Grava a importação (uma transação no servidor) e as regras aprendidas; devolve o id para desfazer. */
export async function saveImport(input: SaveImportInput, rules: api.MerchantRuleRecord[]): Promise<string> {
  if (!remote) throw new Error('Importar precisa da sua conta conectada.');
  try {
    const id =
      input.target.type === 'card'
        ? await api.importCardStatement(supabase, { cardId: input.target.id, fileName: input.fileName, format: input.format, statementMonth: input.statementMonth, items: input.items as api.CardImportItem[] })
        : await api.importAccountStatement(supabase, { accountId: input.target.id, fileName: input.fileName, format: input.format, items: input.items, keepBalance: input.keepBalance });
    // regras aprendidas não podem derrubar a importação
    await api.saveMerchantRules(supabase, rules).catch(() => undefined);
    return id;
  } catch (err) {
    throw api.toKashError(err);
  } finally {
    await refresh();
  }
}

export async function undoImport(importId: string): Promise<void> {
  try {
    await api.undoImport(supabase, importId);
  } catch (err) {
    throw api.toKashError(err);
  } finally {
    await refresh();
  }
}

/** Texto do PDF (já sem dados pessoais) lido pela IA na Edge Function. */
export function readWithAi<T>(input: { text: string; kind: TargetType; categories: string[] }): Promise<T> {
  if (!remote) return Promise.reject(new Error('Ler PDF precisa da sua conta conectada.'));
  return api.readStatementWithAi<T>(supabase, input);
}

/** Nomes e categorias sugeridos pela IA para linhas de OFX/CSV (descrições já limpas; ver `aiNameRequests`). */
export function suggestNamesWithAi(input: { items: { id: string; description: string }[]; categories: string[] }) {
  if (!remote) return Promise.reject(new Error('Sugerir nomes precisa da sua conta conectada.'));
  return api.suggestNamesWithAi(supabase, input);
}
