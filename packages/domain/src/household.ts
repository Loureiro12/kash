import type { Account, Bill, Card, Goal, ID, Invoice, Plan, Tx } from './types';

/** o que cada pessoa vê no app */
export type ViewScope = 'all' | 'mine_shared' | 'shared';
/** avisos dos lançamentos da outra pessoa */
export type NotifyScope = 'shared' | 'all_visible' | 'off';

export interface HouseholdMember {
  userId: ID;
  name: string;
  role: 'owner' | 'member';
  /** a outra pessoa vê meus dados pessoais (só leitura) */
  sharePersonal: boolean;
  viewScope: ViewScope;
  notifyScope: NotifyScope;
  notifyValues: boolean;
}

export interface Household {
  id: ID;
  name: string;
  members: HouseholdMember[];
  /** convite pendente */
  invite: { code: string; expiresAt: string } | null;
}

export const VIEW_SCOPE_LABEL: Record<ViewScope, string> = {
  all: 'Tudo',
  mine_shared: 'Meu e do casal',
  shared: 'Só do casal',
};

/** eu e a outra pessoa no espaço (null se ainda sozinha) */
export function householdPeople(household: Household | null, myId: string | null) {
  const me = household?.members.find((m) => m.userId === myId) ?? null;
  const partner = household?.members.find((m) => m.userId !== myId) ?? null;
  return { me, partner, active: !!me && !!partner };
}

type Owned = { ownerId?: ID; householdId?: ID | null };

/** é compartilhado? */
export const isShared = (item: Owned) => !!item.householdId;

/** posso alterar? (meu ou compartilhado; o pessoal da outra pessoa é só leitura) */
export function canEditItem(item: Owned, myId: string | null): boolean {
  return !item.ownerId || !myId || item.ownerId === myId || isShared(item);
}

/** entra na visão escolhida? */
export function inViewScope(item: Owned, scope: ViewScope, myId: string | null): boolean {
  if (scope === 'shared') return isShared(item);
  if (scope === 'mine_shared') return isShared(item) || !item.ownerId || !myId || item.ownerId === myId;
  return true;
}

export interface ScopedData {
  accounts: Account[];
  cards: Card[];
  txs: Tx[];
  plans: Plan[];
  bills: Bill[];
  goals: Goal[];
  invoices: Invoice[];
}

/**
 * Aplica a visão aos dados que o servidor devolve (tudo o que a pessoa pode ler). Sem espaço
 * compartilhado, devolve tudo. Pagamento de fatura (lançamento na conta) segue a conta.
 */
export function applyViewScope<T extends ScopedData>(data: T, scope: ViewScope, myId: string | null, inHousehold: boolean): T {
  if (!inHousehold || scope === 'all') return data;
  const keep = <I extends Owned>(list: I[]) => list.filter((i) => inViewScope(i, scope, myId));
  return { ...data, accounts: keep(data.accounts), cards: keep(data.cards), txs: keep(data.txs), plans: keep(data.plans), bills: keep(data.bills), goals: keep(data.goals), invoices: keep(data.invoices) };
}

/** rótulo curto de dono para listas: "casal", "Ana" (pessoal da outra pessoa) ou "" (meu) */
export function ownerLabel(item: Owned, myId: string | null, partnerName: string | null): string {
  if (isShared(item)) return 'casal';
  if (item.ownerId && myId && item.ownerId !== myId) return partnerName?.split(/\s+/)[0] ?? 'outra pessoa';
  return '';
}

/** link e mensagem do convite (WhatsApp etc.) */
export function inviteMessage(code: string, fromName: string): string {
  const first = fromName.split(/\s+/)[0] || 'Eu';
  return `${first} te convidou para dividir as finanças no Kash 💚\n\nAbra o link no celular com o Kash instalado:\ncom.andreloureiro.kash://convite?codigo=${code}\n\nOu, no app, vá em Perfil › Conta compartilhada › Tenho um convite e digite o código ${code}.`;
}

/** "ABCD EFGH" para ler e ditar */
export const formatInviteCode = (code: string) => `${code.slice(0, 4)} ${code.slice(4)}`;
