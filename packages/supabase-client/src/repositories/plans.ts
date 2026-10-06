import type { Plan } from '@kash/domain';
import type { KashClient } from '../client';
import { unwrap } from '../errors';
import { num } from '../mappers';
import type { Database } from '../database.types';

export type PlanRow = Database['public']['Tables']['plans']['Row'];

export function toPlan(row: PlanRow): Plan {
  return { id: row.id, title: row.title, category: row.category as Plan['category'], cardId: row.card_id, installments: row.installments, current: row.current, perInstallment: num(row.per_installment) };
}

/** Parcelamentos (todos; a UI filtra os em aberto por cartão). */
export async function listPlans(db: KashClient): Promise<Plan[]> {
  return unwrap(await db.from('plans').select('*').order('created_at')).map(toPlan);
}
