import type { Invoice } from '@kash/domain';
import type { KashClient } from '../client';
import { unwrap } from '../errors';
import { toInvoice } from '../mappers';

export async function listInvoices(db: KashClient): Promise<Invoice[]> {
  return unwrap(await db.from('invoices').select('*').order('month', { ascending: false })).map(toInvoice);
}

/** Paga a fatura debitando a conta; devolve o id do lançamento. */
export async function payInvoice(db: KashClient, input: { invoiceId: string; accountId: string; date?: string }): Promise<string> {
  return unwrap(await db.rpc('pay_invoice', { p_invoice_id: input.invoiceId, p_account_id: input.accountId, ...(input.date ? { p_date: input.date } : {}) }));
}
