import { describe, expect, it } from 'vitest';
import { applyViewScope, canEditItem, formatInviteCode, householdPeople, inviteMessage, ownerLabel, type Household } from '../household';
import type { Account, Tx } from '../types';

const me = 'u-ana';
const partner = 'u-bruno';
const acc = (id: string, ownerId: string, householdId: string | null = null): Account => ({ id, name: id, kind: 'Conta corrente', bank: '', balance: 0, color: '#000', ownerId, householdId }) as Account;
const tx = (id: string, ownerId: string, householdId: string | null = null): Tx => ({ id, title: id, category: 'Comida', amount: -10, date: '2026-11-28', sourceId: 'x', ownerId, householdId });
const data = {
  accounts: [acc('minha', me), acc('casa', me, 'h1'), acc('dele', partner)],
  cards: [],
  txs: [tx('t-minha', me), tx('t-casa', partner, 'h1'), tx('t-dele', partner)],
  plans: [],
  bills: [],
  goals: [],
  invoices: [],
};

describe('conta compartilhada', () => {
  it('visão: tudo, meu e do casal, só do casal', () => {
    expect(applyViewScope(data, 'all', me, true).accounts.map((a) => a.id)).toEqual(['minha', 'casa', 'dele']);
    expect(applyViewScope(data, 'mine_shared', me, true).accounts.map((a) => a.id)).toEqual(['minha', 'casa']);
    expect(applyViewScope(data, 'shared', me, true).txs.map((t) => t.id)).toEqual(['t-casa']);
    // sem espaço, nada muda
    expect(applyViewScope(data, 'shared', me, false)).toBe(data);
  });

  it('edição: o meu e o do casal; o pessoal da outra pessoa é só leitura', () => {
    expect(canEditItem(data.accounts[0]!, me)).toBe(true);
    expect(canEditItem(data.accounts[1]!, me)).toBe(true);
    expect(canEditItem(data.accounts[2]!, me)).toBe(false);
    expect(canEditItem({}, me)).toBe(true);
  });

  it('rótulos, pessoas e convite', () => {
    expect(ownerLabel(data.accounts[1]!, me, 'Bruno Lima')).toBe('casal');
    expect(ownerLabel(data.accounts[2]!, me, 'Bruno Lima')).toBe('Bruno');
    expect(ownerLabel(data.accounts[0]!, me, 'Bruno Lima')).toBe('');
    const h: Household = { id: 'h1', name: 'Nossa conta', invite: null, members: [
      { userId: me, name: 'Ana', role: 'owner', sharePersonal: false, viewScope: 'all', notifyScope: 'shared', notifyValues: true },
      { userId: partner, name: 'Bruno', role: 'member', sharePersonal: true, viewScope: 'shared', notifyScope: 'shared', notifyValues: true },
    ] };
    expect(householdPeople(h, me)).toMatchObject({ active: true, me: { name: 'Ana' }, partner: { name: 'Bruno' } });
    expect(householdPeople({ ...h, members: [h.members[0]!] }, me).active).toBe(false);
    expect(householdPeople(null, me).active).toBe(false);
    expect(formatInviteCode('ABCDEFGH')).toBe('ABCD EFGH');
    expect(inviteMessage('ABCDEFGH', 'Ana Souza')).toContain('Ana te convidou');
    expect(inviteMessage('ABCDEFGH', 'Ana Souza')).toContain('convite?codigo=ABCDEFGH');
  });
});
