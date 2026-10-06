import { createClient, type SupabaseClient, type SupabaseClientOptions } from '@supabase/supabase-js';
import type { Database } from './database.types';

export type KashClient = SupabaseClient<Database>;

export interface KashClientConfig {
  url: string;
  anonKey: string;
  /** opções extras (ex.: storage seguro no app) */
  options?: SupabaseClientOptions<'public'>;
}

/** Cria o cliente tipado do Kash. O app injeta o storage da sessão; os testes usam o padrão em memória. */
export function createKashClient({ url, anonKey, options }: KashClientConfig): KashClient {
  return createClient<Database>(url, anonKey, options);
}
