import { toKashError } from '@kash/supabase-client';
import { queryClient } from './queryClient';
import { queryKeys } from './keys';
import { DATA_SOURCE } from './source';

export interface PersistOptions {
  /** chamado com a mensagem pronta para a UI quando a escrita falha */
  onError?: (message: string) => void;
  /** chamado com o resultado quando a escrita dá certo (antes de refazer o snapshot) */
  onSuccess?: (result: unknown) => void;
}

/**
 * Escrita otimista: o store já foi atualizado localmente; aqui a mudança vai pro servidor e,
 * dando certo ou não, o snapshot é refeito — o servidor é a verdade (ids reais, rollback em erro).
 * No modo `seed` não faz nada (as escritas ficam em memória).
 */
export async function persist<T>(task: () => Promise<T>, options: PersistOptions = {}): Promise<T | undefined> {
  if (DATA_SOURCE !== 'remote') return undefined;
  let result: T | undefined;
  try {
    result = await task();
    options.onSuccess?.(result);
  } catch (err) {
    options.onError?.(toKashError(err).message);
  } finally {
    await queryClient.invalidateQueries({ queryKey: queryKeys.snapshotRoot });
  }
  return result;
}
