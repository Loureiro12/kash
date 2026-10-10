import type { KashClient } from '../client';
import { unwrap } from '../errors';

export interface TransferInput {
  fromAccountId: string;
  toAccountId: string;
  /** valor positivo */
  amount: number;
  /** ISO yyyy-mm-dd */
  date: string;
  /** descrição; vazia vira "Transferência" */
  title?: string;
}

/** Transferência entre contas: duas pernas ligadas (saída e entrada). Devolve o id da transferência. */
export async function createTransfer(db: KashClient, input: TransferInput): Promise<string> {
  return unwrap(await db.rpc('create_transfer', { p_from: input.fromAccountId, p_to: input.toAccountId, p_amount: input.amount, p_date: input.date, p_title: input.title?.trim() ?? '' }));
}

/** Edita as duas pernas de uma vez (valor, data, contas e descrição). */
export async function updateTransfer(db: KashClient, transferId: string, input: TransferInput): Promise<void> {
  unwrap(await db.rpc('update_transfer', { p_transfer_id: transferId, p_from: input.fromAccountId, p_to: input.toAccountId, p_amount: input.amount, p_date: input.date, p_title: input.title?.trim() ?? '' }));
}
