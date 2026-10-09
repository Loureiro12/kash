import { createKashClient, type KashClient } from '@kash/supabase-client';

/** Chave da sessão no localStorage (separada de qualquer outro app no mesmo domínio). */
export const SESSION_STORAGE_KEY = 'kash-web-auth';

let client: KashClient | null | undefined;

/** As variáveis públicas do Supabase entram no build (process.env.NEXT_PUBLIC_*). */
export const isKashConfigured = () => !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Cliente do Supabase do Kash web: sessão persistida no navegador e renovada sozinha.
 * Singleton (um por aba); null quando as variáveis públicas não estão configuradas.
 * Para ações pontuais sem sessão (excluir conta pelo site) existe `createEphemeralClient`.
 */
export function getKashClient(): KashClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey || typeof window === 'undefined') {
    if (typeof window !== 'undefined') client = null;
    return null;
  }
  client = createKashClient({
    url,
    anonKey,
    options: { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: SESSION_STORAGE_KEY } },
  });
  return client;
}

/** Igual a `getKashClient`, mas falha alto: usado depois que a sessão já existe. */
export function requireKashClient(): KashClient {
  const db = getKashClient();
  if (!db) throw new Error('Supabase não configurado (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY).');
  return db;
}
