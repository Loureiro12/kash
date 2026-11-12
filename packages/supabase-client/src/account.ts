import type { KashClient } from './client';
import { KashApiError, toKashError } from './errors';

/** Exclui a conta do usuário logado via Edge Function (apaga o usuário no Auth; os dados caem por cascade). */
export async function deleteOwnAccount(db: KashClient): Promise<void> {
  try {
    const { error } = await db.functions.invoke('delete-account', { method: 'POST' });
    if (error) throw new KashApiError('unknown', 'Não deu pra excluir a conta agora. Tenta de novo.', error);
    await db.auth.signOut({ scope: 'local' });
  } catch (err) {
    throw toKashError(err);
  }
}

/**
 * "Zerar meus dados": apaga tudo o que é financeiro e volta categorias, limite e boas-vindas ao padrão,
 * mantendo o login (RPC `reset_my_data`). Não tem volta.
 */
export async function resetMyData(db: KashClient): Promise<void> {
  try {
    const { error } = await db.rpc('reset_my_data');
    if (error) throw new KashApiError('unknown', 'Não deu pra zerar seus dados agora. Tenta de novo.', error);
  } catch (err) {
    throw toKashError(err);
  }
}
