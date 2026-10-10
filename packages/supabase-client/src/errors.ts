import type { AuthError, PostgrestError, PostgrestSingleResponse } from '@supabase/supabase-js';

export type KashErrorCode = 'network' | 'unauthorized' | 'invalid_credentials' | 'email_taken' | 'weak_password' | 'not_found' | 'conflict' | 'validation' | 'unknown';

/** Erro normalizado: código estável + mensagem pronta para a UI (pt-BR). */
export class KashApiError extends Error {
  constructor(
    public readonly code: KashErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'KashApiError';
  }
}

const NETWORK_MESSAGE = 'Sem conexão. Confere sua internet e tenta de novo.';

export function fromPostgrestError(error: PostgrestError): KashApiError {
  if (error.code === 'PGRST116' || error.code === 'P0002') return new KashApiError('not_found', 'Não encontramos esse registro.', error);
  if (error.code === '23505') return new KashApiError('conflict', 'Já existe um registro igual.', error);
  if (error.code === '23514' || error.code === '22P02' || error.code === '23502') return new KashApiError('validation', 'Alguns dados não são válidos.', error);
  if (error.code === '42501' || error.code === 'PGRST301') return new KashApiError('unauthorized', 'Você precisa entrar de novo.', error);
  if (/fetch|network/i.test(error.message)) return new KashApiError('network', NETWORK_MESSAGE, error);
  return new KashApiError('unknown', 'Não deu pra concluir. Tenta de novo.', error);
}

export function fromAuthError(error: AuthError): KashApiError {
  const msg = error.message.toLowerCase();
  if (error.status === 400 && /invalid login credentials|invalid_credentials/.test(msg)) return new KashApiError('invalid_credentials', 'E-mail ou senha incorretos.', error);
  if (/already registered|already been registered|user_already_exists/.test(msg)) return new KashApiError('email_taken', 'Esse e-mail já tem conta. Quer entrar?', error);
  if (/password|weak/.test(msg) && /short|weak|characters/.test(msg)) return new KashApiError('weak_password', 'A senha precisa ter pelo menos 6 caracteres.', error);
  if (/different from the old password|same_password/.test(msg)) return new KashApiError('validation', 'A nova senha precisa ser diferente da atual.', error);
  if (/fetch|network/.test(msg)) return new KashApiError('network', NETWORK_MESSAGE, error);
  return new KashApiError('unknown', 'Não deu pra concluir. Tenta de novo.', error);
}

/** Converte qualquer erro lançado (ex.: fetch) em KashApiError. */
export function toKashError(err: unknown): KashApiError {
  if (err instanceof KashApiError) return err;
  if (err instanceof TypeError && /fetch/i.test(err.message)) return new KashApiError('network', NETWORK_MESSAGE, err);
  return new KashApiError('unknown', 'Não deu pra concluir. Tenta de novo.', err);
}

/** Desembrulha { data, error } do PostgREST lançando KashApiError. */
// PostgrestSingleResponse<T> cobre também listas (T = Row[]); a união com PostgrestResponse deixava T ambíguo
export function unwrap<T>(result: PostgrestSingleResponse<T>): T {
  if (result.error) throw fromPostgrestError(result.error);
  return result.data as T;
}
