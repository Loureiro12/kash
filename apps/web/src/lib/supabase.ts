import { createKashClient, type KashClient } from '@kash/supabase-client';

/** Armazenamento só em memória: a sessão some ao fechar a aba (nada fica no navegador). */
function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  };
}

/**
 * Cliente do Supabase para ações pontuais no site (ex.: excluir conta). Sem sessão persistida e sem
 * renovar token sozinho. null quando as variáveis públicas não estão configuradas.
 */
export function createEphemeralClient(): KashClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createKashClient({
    url,
    anonKey,
    options: { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storage: memoryStorage() } },
  });
}
