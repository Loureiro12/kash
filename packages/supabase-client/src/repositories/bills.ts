import type { Bill, Category, SourceType } from '@kash/domain';
import type { KashClient } from '../client';
import { unwrap } from '../errors';
import { toBill } from '../mappers';

export interface BillInput {
  name: string;
  amount: number;
  dueDay: number;
  category: Category;
  source: { type: SourceType; id: string } | null;
  /** compartilhada com o casal; ausente = não muda (cobrada em conta/cartão do casal já é) */
  householdId?: string | null;
}

const toRow = (input: BillInput) => ({
  name: input.name.trim(),
  amount: input.amount,
  due_day: input.dueDay,
  category: input.category,
  source_type: input.source?.type ?? null,
  source_id: input.source?.id ?? null,
  ...(input.householdId !== undefined ? { household_id: input.householdId } : {}),
});

export async function listBills(db: KashClient): Promise<Bill[]> {
  return unwrap(await db.from('bills').select('*').order('due_day')).map(toBill);
}

export async function createBill(db: KashClient, input: BillInput): Promise<Bill> {
  return toBill(unwrap(await db.from('bills').insert(toRow(input)).select('*').single()));
}

export async function updateBill(db: KashClient, id: string, input: BillInput): Promise<Bill> {
  return toBill(unwrap(await db.from('bills').update(toRow(input)).eq('id', id).select('*').single()));
}

export async function deleteBill(db: KashClient, id: string): Promise<void> {
  unwrap(await db.from('bills').delete().eq('id', id));
}

/** Marca como paga gerando o lançamento; devolve o id do lançamento. */
export async function payBill(db: KashClient, id: string, date?: string): Promise<string> {
  return unwrap(await db.rpc('pay_bill', { p_bill_id: id, ...(date ? { p_date: date } : {}) }));
}

/**
 * Marca a conta como paga com um lançamento que já existe neste mês (a cobrança da assinatura já
 * lançada ou importada), sem criar outro. Desmarcar depois não apaga esse lançamento.
 */
export async function linkBillPayment(db: KashClient, billId: string, txId: string): Promise<void> {
  unwrap(await db.rpc('link_bill_payment', { p_bill_id: billId, p_tx_id: txId }));
}

export async function unpayBill(db: KashClient, id: string): Promise<void> {
  unwrap(await db.rpc('unpay_bill', { p_bill_id: id }));
}
