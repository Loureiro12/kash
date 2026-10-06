import type { Account, AccountKind } from '@kash/domain';
import type { KashClient } from '../client';
import { unwrap } from '../errors';
import { accountKindToEnum, toAccount } from '../mappers';

export interface AccountInput {
  name: string;
  kind: AccountKind;
  institution: string;
  /** saldo que o usuário vê hoje; vira opening_balance ajustado pelos lançamentos existentes */
  balance: number;
  color: string;
}

export async function listAccounts(db: KashClient): Promise<Account[]> {
  const rows = unwrap(await db.from('accounts_with_balance').select('*').order('position').order('created_at'));
  return rows.map(toAccount);
}

export async function createAccount(db: KashClient, input: AccountInput): Promise<Account> {
  const row = unwrap(
    await db
      .from('accounts')
      .insert({ name: input.name.trim(), kind: accountKindToEnum(input.kind), institution: input.institution.trim(), opening_balance: input.balance, color: input.color })
      .select('id')
      .single(),
  );
  return getAccount(db, row.id);
}

export async function getAccount(db: KashClient, id: string): Promise<Account> {
  return toAccount(unwrap(await db.from('accounts_with_balance').select('*').eq('id', id).single()));
}

export async function updateAccount(db: KashClient, id: string, input: AccountInput): Promise<Account> {
  // saldo desejado − lançamentos ativos = nova abertura
  const current = unwrap(await db.from('accounts_with_balance').select('balance, opening_balance').eq('id', id).single());
  const txSum = Number(current.balance) - Number(current.opening_balance);
  unwrap(
    await db
      .from('accounts')
      .update({ name: input.name.trim(), kind: accountKindToEnum(input.kind), institution: input.institution.trim(), opening_balance: input.balance - txSum, color: input.color })
      .eq('id', id)
      .select('id'),
  );
  return getAccount(db, id);
}

/** Exclui a conta e seus lançamentos (RPC com cascata controlada). */
export async function deleteAccount(db: KashClient, id: string): Promise<void> {
  unwrap(await db.rpc('delete_account', { p_account_id: id }));
}
