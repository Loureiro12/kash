import type { Category, SourceType, Tx } from '@kash/domain';
import type { KashClient } from '../client';
import type { Database } from '../database.types';
import { unwrap } from '../errors';
import { toTx } from '../mappers';

export interface TxInput {
  title: string;
  category: Category | 'Entrada';
  /** valor absoluto; o sinal vem do tipo (Entrada > 0, resto < 0) */
  amount: number;
  date: string;
  sourceType: SourceType;
  sourceId: string;
}

const signed = (input: Pick<TxInput, 'category' | 'amount'>) => (input.category === 'Entrada' ? Math.abs(input.amount) : -Math.abs(input.amount));

/** Lançamentos ativos num intervalo de datas (inclusive), do mais recente para o mais antigo. */
export async function listTransactions(db: KashClient, range?: { from: string; to: string }): Promise<Tx[]> {
  let q = db.from('transactions').select('*').is('deleted_at', null).order('date', { ascending: false }).order('created_at', { ascending: false });
  if (range) q = q.gte('date', range.from).lte('date', range.to);
  return unwrap(await q).map(toTx);
}

export async function createTransaction(db: KashClient, input: TxInput): Promise<Tx> {
  const row = unwrap(
    await db
      .from('transactions')
      .insert({ title: input.title.trim(), category: input.category, amount: signed(input), date: input.date, source_type: input.sourceType, source_id: input.sourceId })
      .select('*')
      .single(),
  );
  return toTx(row);
}

export async function updateTransaction(db: KashClient, id: string, input: Partial<TxInput>): Promise<Tx> {
  const patch: Database['public']['Tables']['transactions']['Update'] = {};
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.date !== undefined) patch.date = input.date;
  if (input.sourceType !== undefined) patch.source_type = input.sourceType;
  if (input.sourceId !== undefined) patch.source_id = input.sourceId;
  if (input.category !== undefined) patch.category = input.category;
  if (input.amount !== undefined) {
    const category = input.category ?? (unwrap(await db.from('transactions').select('category').eq('id', id).single()).category as TxInput['category']);
    patch.amount = signed({ category, amount: input.amount });
  }
  return toTx(unwrap(await db.from('transactions').update(patch).eq('id', id).select('*').single()));
}

/** Gasto parcelado no cartão: cria o plano e a 1ª parcela. Devolve o id do plano. */
export async function addInstallmentPurchase(db: KashClient, input: { title: string; category: Category; cardId: string; total: number; installments: number; date?: string }): Promise<string> {
  return unwrap(
    await db.rpc('add_installment_purchase', {
      p_title: input.title.trim(),
      p_category: input.category,
      p_card_id: input.cardId,
      p_total: input.total,
      p_installments: input.installments,
      ...(input.date ? { p_date: input.date } : {}),
    }),
  );
}

/** Soft delete; devolve o grupo para desfazer. */
export async function softDeleteTransaction(db: KashClient, id: string, scope: 'single' | 'plan' = 'single'): Promise<string> {
  return unwrap(await db.rpc('soft_delete_transaction', { p_tx_id: id, p_scope: scope }));
}

export async function undoDeleteTransaction(db: KashClient, group: string): Promise<number> {
  return unwrap(await db.rpc('undo_delete_transaction', { p_group: group }));
}
