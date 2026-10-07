import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/database.types';
import { createKashClient, type KashClient } from '../src/client';

const url = () => process.env.SUPABASE_URL!;
const anon = () => process.env.SUPABASE_ANON_KEY!;
const service = () => process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** Cliente com service role (bypassa RLS) — só para preparar/limpar dados de teste. */
export const admin = () => createClient<Database>(url(), service(), { auth: { persistSession: false, autoRefreshToken: false } });

export interface TestUser {
  id: string;
  email: string;
  password: string;
  db: KashClient;
}

/** Cria um usuário confirmado e devolve um cliente já logado (RLS ativa). */
export async function createTestUser(label = 'user', name = 'Teste'): Promise<TestUser> {
  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@kash.test`;
  const password = 'senha-123456';
  const { data, error } = await admin().auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } });
  if (error || !data.user) throw error ?? new Error('createUser falhou');
  const db = createKashClient({ url: url(), anonKey: anon(), options: { auth: { persistSession: false, autoRefreshToken: false } } });
  const signIn = await db.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  return { id: data.user.id, email, password, db };
}

export async function deleteTestUser(user: TestUser) {
  await admin().auth.admin.deleteUser(user.id);
}

/** mesma data que `public.kash_today()` (fuso America/Sao_Paulo), não a data UTC */
export const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
export const anonClient = () => createKashClient({ url: url(), anonKey: anon(), options: { auth: { persistSession: false, autoRefreshToken: false } } });
