import type { Session } from '@supabase/supabase-js';
import type { KashClient } from './client';
import { fromAuthError, toKashError } from './errors';

export interface Credentials {
  email: string;
  password: string;
}

/** Entra com e-mail e senha. Lança KashApiError (invalid_credentials, network…). */
export async function signIn(db: KashClient, { email, password }: Credentials): Promise<Session> {
  try {
    const { data, error } = await db.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw fromAuthError(error);
    return data.session;
  } catch (err) {
    throw toKashError(err);
  }
}

/** Cria a conta (o perfil nasce por trigger com o nome). Sem confirmação de e-mail no local; em produção pode voltar sessão null. */
export async function signUp(db: KashClient, input: Credentials & { name: string }): Promise<Session | null> {
  try {
    const { data, error } = await db.auth.signUp({ email: input.email.trim(), password: input.password, options: { data: { name: input.name.trim() } } });
    if (error) throw fromAuthError(error);
    return data.session;
  } catch (err) {
    throw toKashError(err);
  }
}

export async function requestPasswordReset(db: KashClient, email: string, redirectTo?: string): Promise<void> {
  try {
    const { error } = await db.auth.resetPasswordForEmail(email.trim(), redirectTo ? { redirectTo } : undefined);
    if (error) throw fromAuthError(error);
  } catch (err) {
    throw toKashError(err);
  }
}

export async function updatePassword(db: KashClient, password: string): Promise<void> {
  const { error } = await db.auth.updateUser({ password });
  if (error) throw fromAuthError(error);
}

export async function signOut(db: KashClient): Promise<void> {
  const { error } = await db.auth.signOut();
  if (error) throw fromAuthError(error);
}
