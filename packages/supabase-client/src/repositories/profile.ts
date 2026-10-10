import type { Settings, User } from '@kash/domain';
import type { KashClient } from '../client';
import type { Database } from '../database.types';
import { KashApiError, unwrap } from '../errors';
import { toSettings, toUser } from '../mappers';

export interface ProfileData {
  user: User;
  settings: Settings;
  lastRolloverMonth: string;
}

/** id e e-mail do usuário logado (o PostgREST exige filtro em updates). */
async function currentUser(db: KashClient): Promise<{ id: string; email: string }> {
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) throw new KashApiError('unauthorized', 'Você precisa entrar de novo.', error);
  return { id: data.user.id, email: data.user.email ?? '' };
}

export async function getProfile(db: KashClient): Promise<ProfileData> {
  const me = await currentUser(db);
  const row = unwrap(await db.from('profiles').select('*').eq('id', me.id).single());
  return { user: toUser(row, me.email), settings: toSettings(row), lastRolloverMonth: row.last_rollover_month };
}

export async function updateUser(db: KashClient, input: Partial<Pick<User, 'name' | 'phone'>>): Promise<void> {
  const patch: Database['public']['Tables']['profiles']['Update'] = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.phone !== undefined) patch.phone = input.phone.trim();
  const me = await currentUser(db);
  unwrap(await db.from('profiles').update(patch).eq('id', me.id).select('id'));
}

export async function updateSettings(db: KashClient, input: Partial<Settings>): Promise<void> {
  const patch: Database['public']['Tables']['profiles']['Update'] = {};
  if (input.theme !== undefined) patch.theme = input.theme;
  if (input.hideValues !== undefined) patch.hide_values = input.hideValues;
  if (input.billReminder !== undefined) patch.bill_reminder = input.billReminder;
  if (input.emailReminder !== undefined) patch.email_reminder = input.emailReminder;
  if (input.onboardingDone !== undefined) patch.onboarding_done_at = input.onboardingDone ? new Date().toISOString() : null;
  if (input.checklistHidden !== undefined) patch.checklist_hidden_at = input.checklistHidden ? new Date().toISOString() : null;
  if (input.monthlyBudget !== undefined) patch.monthly_budget = input.monthlyBudget;
  if (input.biometrics !== undefined) patch.biometrics = input.biometrics;
  const me = await currentUser(db);
  unwrap(await db.from('profiles').update(patch).eq('id', me.id).select('id'));
}

/** Virada de mês do usuário logado; devolve quantos meses foram processados. */
export async function ensureRollover(db: KashClient): Promise<number> {
  return unwrap(await db.rpc('ensure_rollover'));
}
