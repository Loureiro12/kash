import type { Card, CardGradientId } from '@kash/domain';
import type { KashClient } from '../client';
import { unwrap } from '../errors';
import { num, toCard } from '../mappers';

export interface CardInput {
  name: string;
  last4: string;
  limit: number;
  closingDay: number;
  dueDay: number;
  gradientId: CardGradientId;
}

const toRow = (input: CardInput) => ({ name: input.name.trim(), last4: input.last4, credit_limit: input.limit, closing_day: input.closingDay, due_day: input.dueDay, gradient: input.gradientId });

export async function listCards(db: KashClient): Promise<Card[]> {
  return unwrap(await db.from('cards').select('*').order('position').order('created_at')).map(toCard);
}

/** Fatura atual (saídas do mês) por cartão. */
export async function getCardUsage(db: KashClient): Promise<Record<string, number>> {
  const rows = unwrap(await db.from('card_usage').select('card_id, used'));
  return Object.fromEntries(rows.map((r) => [r.card_id ?? '', num(r.used)]));
}

export async function createCard(db: KashClient, input: CardInput): Promise<Card> {
  return toCard(unwrap(await db.from('cards').insert(toRow(input)).select('*').single()));
}

export async function updateCard(db: KashClient, id: string, input: CardInput): Promise<Card> {
  return toCard(unwrap(await db.from('cards').update(toRow(input)).eq('id', id).select('*').single()));
}

/** Exclui o cartão com lançamentos, parcelamentos e faturas. */
export async function deleteCard(db: KashClient, id: string): Promise<void> {
  unwrap(await db.rpc('delete_card', { p_card_id: id }));
}
