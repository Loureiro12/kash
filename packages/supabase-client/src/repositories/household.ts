import type { Household, HouseholdMember, NotifyScope, ViewScope } from '@kash/domain';
import type { KashClient } from '../client';
import { KashApiError, toKashError, unwrap } from '../errors';

interface OverviewRow {
  id: string;
  name: string;
  members: Array<{ user_id: string; name: string; role: 'owner' | 'member'; share_personal: boolean; view_scope: ViewScope; notify_scope: NotifyScope; notify_values: boolean }> | null;
  invite: { code: string; expires_at: string } | null;
}

export function toHousehold(row: OverviewRow | null): Household | null {
  if (!row) return null;
  const members: HouseholdMember[] = (row.members ?? []).map((m) => ({
    userId: m.user_id,
    name: m.name,
    role: m.role,
    sharePersonal: m.share_personal,
    viewScope: m.view_scope,
    notifyScope: m.notify_scope,
    notifyValues: m.notify_values,
  }));
  return { id: row.id, name: row.name, members, invite: row.invite ? { code: row.invite.code, expiresAt: row.invite.expires_at } : null };
}

/** Espaço compartilhado da pessoa logada (null se não participa de nenhum). */
export async function getHousehold(db: KashClient): Promise<Household | null> {
  return toHousehold(unwrap(await db.rpc('household_overview')) as unknown as OverviewRow | null);
}

const INVITE_ERRORS: Record<string, string> = {
  'invite invalid': 'Esse convite não existe ou já venceu. Peça um novo.',
  'own invite': 'Esse convite é seu: mande para a outra pessoa.',
  'already in household': 'Você já divide a conta com alguém. Saia dela antes de entrar em outra.',
  'household full': 'Essa conta compartilhada já tem duas pessoas.',
};

function friendly(err: unknown): never {
  const message = (err as { message?: string })?.message ?? '';
  const known = Object.keys(INVITE_ERRORS).find((k) => message.includes(k));
  if (known) throw new KashApiError('validation', INVITE_ERRORS[known]!, err);
  throw toKashError(err);
}

/** Gera (ou devolve o vigente) código de convite; cria o espaço na primeira vez. */
export async function createHouseholdInvite(db: KashClient): Promise<{ code: string; expiresAt: string }> {
  const { data, error } = await db.rpc('create_household_invite');
  if (error) friendly(error);
  const r = data as { code: string; expires_at: string };
  return { code: r.code, expiresAt: r.expires_at };
}

export async function cancelHouseholdInvites(db: KashClient): Promise<void> {
  unwrap(await db.rpc('cancel_household_invites'));
}

/** Entra no espaço de quem convidou. */
export async function acceptHouseholdInvite(db: KashClient, code: string): Promise<string> {
  const { data, error } = await db.rpc('accept_household_invite', { p_code: code.replace(/\s+/g, '').toUpperCase() });
  if (error) friendly(error);
  return data as string;
}

export interface HouseholdSettingsInput {
  sharePersonal?: boolean;
  viewScope?: ViewScope;
  notifyScope?: NotifyScope;
  notifyValues?: boolean;
  name?: string;
}

export async function updateHouseholdSettings(db: KashClient, input: HouseholdSettingsInput): Promise<void> {
  unwrap(
    await db.rpc('update_household_settings', {
      ...(input.sharePersonal !== undefined ? { p_share_personal: input.sharePersonal } : {}),
      ...(input.viewScope ? { p_view_scope: input.viewScope } : {}),
      ...(input.notifyScope ? { p_notify_scope: input.notifyScope } : {}),
      ...(input.notifyValues !== undefined ? { p_notify_values: input.notifyValues } : {}),
      ...(input.name ? { p_name: input.name } : {}),
    }),
  );
}

/** Sai do espaço: o que a pessoa criou no compartilhado fica com a outra. */
export async function leaveHousehold(db: KashClient): Promise<void> {
  unwrap(await db.rpc('leave_household'));
}

/** Guarda o token de push (Expo) deste aparelho. */
export async function savePushToken(db: KashClient, token: string, platform: 'ios' | 'android'): Promise<void> {
  unwrap(await db.from('push_tokens').upsert({ token, platform, updated_at: new Date().toISOString() }, { onConflict: 'token' }).select('token'));
}

/** Tira o token (logout): este aparelho para de receber os avisos. */
export async function removePushToken(db: KashClient, token: string): Promise<void> {
  unwrap(await db.from('push_tokens').delete().eq('token', token));
}
