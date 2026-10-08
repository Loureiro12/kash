import type { Session } from '@supabase/supabase-js';
import type { KashClient } from './client';
import { fromAuthError, KashApiError, toKashError } from './errors';

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
  try {
    const { error } = await db.auth.updateUser({ password });
    if (error) throw fromAuthError(error);
  } catch (err) {
    throw toKashError(err);
  }
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

/** Troca a senha do usuário logado confirmando a atual (re-autentica antes de atualizar). */
export async function changePassword(db: KashClient, { currentPassword, newPassword }: ChangePasswordInput): Promise<void> {
  try {
    const { data, error: userError } = await db.auth.getUser();
    const email = data.user?.email;
    if (userError || !email) throw new KashApiError('unauthorized', 'Você precisa entrar de novo.', userError);
    const { error: reauth } = await db.auth.signInWithPassword({ email, password: currentPassword });
    if (reauth) throw reauth.status === 400 ? new KashApiError('invalid_credentials', 'Senha atual incorreta.', reauth) : fromAuthError(reauth);
    const { error } = await db.auth.updateUser({ password: newPassword });
    if (error) throw fromAuthError(error);
  } catch (err) {
    throw toKashError(err);
  }
}

/** Código de recuperação: 6 dígitos no local, 8 no projeto hospedado (`auth.email.otp_length`). */
export const RECOVERY_CODE_PATTERN = /^\d{6,8}$/;

/**
 * Troca o código de recuperação enviado por e-mail por uma sessão (tipo `recovery`), que permite
 * definir a nova senha com `updatePassword`. Código errado, expirado ou já usado → KashApiError(validation).
 */
export async function verifyRecoveryCode(db: KashClient, email: string, code: string): Promise<Session> {
  const token = code.replace(/\D/g, '');
  if (!RECOVERY_CODE_PATTERN.test(token)) throw new KashApiError('validation', 'Digite o código que chegou no seu e-mail.');
  try {
    const { data, error } = await db.auth.verifyOtp({ email: email.trim(), token, type: 'recovery' });
    if (error || !data.session) {
      if (error && /fetch|network/i.test(error.message)) throw fromAuthError(error);
      throw new KashApiError('validation', 'Código inválido ou expirado. Confira ou peça um novo.', error);
    }
    return data.session;
  } catch (err) {
    throw toKashError(err);
  }
}

/** Caminho do deep link de recuperação (`<scheme>://reset-password`). */
export const RECOVERY_PATH = 'reset-password';

export interface RecoveryLink {
  /** link do template de e-mail do app: `?token_hash=…&type=recovery` */
  tokenHash?: string;
  /** link padrão do Supabase (fluxo implícito): `#access_token=…&refresh_token=…` */
  accessToken?: string;
  refreshToken?: string;
  /** `#error=…&error_description=…` (link expirado/usado) */
  error?: string;
}

/** Interpreta um deep link de recuperação de senha; null se a URL não for de recuperação. */
export function parseRecoveryUrl(url: string): RecoveryLink | null {
  if (!url.includes(RECOVERY_PATH)) return null;
  const [beforeHash = '', hash = ''] = url.split('#');
  const query = beforeHash.split('?')[1] ?? '';
  const params = new URLSearchParams([query, hash].filter(Boolean).join('&'));
  const error = params.get('error_description') ?? params.get('error');
  if (error) return { error };
  const tokenHash = params.get('token_hash');
  if (tokenHash) return { tokenHash };
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) return { accessToken, refreshToken };
  return { error: 'Link de recuperação incompleto.' };
}

/**
 * Abre a sessão de recuperação a partir do deep link. Devolve null se a URL não for de recuperação;
 * lança KashApiError(validation) se o link expirou ou já foi usado.
 */
export async function recoverSessionFromUrl(db: KashClient, url: string): Promise<Session | null> {
  const link = parseRecoveryUrl(url);
  if (!link) return null;
  try {
    if (link.error) throw new KashApiError('validation', 'Esse link expirou ou já foi usado. Peça um novo.', link.error);
    if (link.tokenHash) {
      const { data, error } = await db.auth.verifyOtp({ token_hash: link.tokenHash, type: 'recovery' });
      if (error || !data.session) throw new KashApiError('validation', 'Esse link expirou ou já foi usado. Peça um novo.', error);
      return data.session;
    }
    const { data, error } = await db.auth.setSession({ access_token: link.accessToken!, refresh_token: link.refreshToken! });
    if (error || !data.session) throw new KashApiError('validation', 'Esse link expirou ou já foi usado. Peça um novo.', error);
    return data.session;
  } catch (err) {
    throw toKashError(err);
  }
}

export async function signOut(db: KashClient): Promise<void> {
  const { error } = await db.auth.signOut();
  if (error) throw fromAuthError(error);
}
