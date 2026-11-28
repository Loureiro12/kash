import type { Debt } from '@kash/domain';
import type { KashClient } from '../client';
import { unwrap } from '../errors';
import { toDebt } from '../mappers';

export interface DebtInput {
  person: string;
  description: string;
  amount: number;
  kind: Debt['kind'];
  date: string;
  dueDate: string | null;
}

const toRow = (input: DebtInput) => ({
  person: input.person.trim(),
  description: input.description.trim(),
  amount: input.amount,
  kind: input.kind,
  date: input.date,
  due_date: input.dueDate,
});

/** "Quem me deve": pendentes primeiro, depois as recebidas (mais recentes antes). */
export async function listDebts(db: KashClient): Promise<Debt[]> {
  return unwrap(await db.from('debts').select('*').order('date', { ascending: false })).map(toDebt);
}

export async function createDebt(db: KashClient, input: DebtInput): Promise<Debt> {
  return toDebt(unwrap(await db.from('debts').insert(toRow(input)).select('*').single()));
}

export async function updateDebt(db: KashClient, id: string, input: DebtInput): Promise<Debt> {
  return toDebt(unwrap(await db.from('debts').update(toRow(input)).eq('id', id).select('*').single()));
}

export async function deleteDebt(db: KashClient, id: string): Promise<void> {
  unwrap(await db.from('debts').delete().eq('id', id));
}

/** Recebi: com `accountId`, lança a entrada na conta; devolve o id dela (ou null). */
export async function settleDebt(db: KashClient, id: string, accountId: string | null, date?: string): Promise<string | null> {
  return unwrap(await db.rpc('settle_debt', { p_debt_id: id, ...(accountId ? { p_account_id: accountId } : {}), ...(date ? { p_date: date } : {}) }));
}

/** Desfaz o "recebi" (apaga a entrada lançada). */
export async function unsettleDebt(db: KashClient, id: string): Promise<void> {
  unwrap(await db.rpc('unsettle_debt', { p_debt_id: id }));
}
