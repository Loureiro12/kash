import type { Goal } from '@kash/domain';
import type { KashClient } from '../client';
import { unwrap } from '../errors';
import { toGoal } from '../mappers';

export interface GoalInput {
  name: string;
  target: number;
  saved: number;
  monthly: number;
  color: string;
  accountId?: string;
  depositDay?: number | null;
}

const toRow = (input: GoalInput) => ({
  name: input.name.trim(),
  target: input.target,
  saved: Math.min(input.saved, input.target),
  monthly: input.monthly,
  color: input.color,
  account_id: input.accountId ?? null,
  deposit_day: input.depositDay ?? null,
});

export async function listGoals(db: KashClient): Promise<Goal[]> {
  return unwrap(await db.from('goals').select('*').order('created_at')).map(toGoal);
}

export async function createGoal(db: KashClient, input: GoalInput): Promise<Goal> {
  return toGoal(unwrap(await db.from('goals').insert(toRow(input)).select('*').single()));
}

export async function updateGoal(db: KashClient, id: string, input: GoalInput): Promise<Goal> {
  return toGoal(unwrap(await db.from('goals').update(toRow(input)).eq('id', id).select('*').single()));
}

export async function deleteGoal(db: KashClient, id: string): Promise<void> {
  unwrap(await db.from('goals').delete().eq('id', id));
}

/** Depósito na meta (sem passar do alvo), com conta opcional. */
export async function recordGoalDeposit(db: KashClient, input: { goalId: string; amount: number; accountId?: string; date?: string }): Promise<void> {
  unwrap(await db.rpc('record_goal_deposit', { p_goal_id: input.goalId, p_amount: input.amount, ...(input.accountId ? { p_account_id: input.accountId } : {}), ...(input.date ? { p_date: input.date } : {}) }));
}
