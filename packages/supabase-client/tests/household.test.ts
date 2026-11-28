import { acceptHouseholdInvite, createAccount, createHouseholdInvite, createTransaction, getHousehold, leaveHousehold, loadSnapshot, savePushToken, updateHouseholdSettings } from '../src';
import { createTestUser, deleteTestUser, today } from './helpers';

describe('conta compartilhada (servidor)', () => {
  it('convite, conta da casa visível para os dois, visão e saída', async () => {
    const ana = await createTestUser('casal-ana', 'Ana');
    const bruno = await createTestUser('casal-bruno', 'Bruno');

    const invite = await createHouseholdInvite(ana.db);
    expect(invite.code).toMatch(/^[A-Z0-9]{8}$/);
    await expect(acceptHouseholdInvite(ana.db, invite.code)).rejects.toMatchObject({ message: 'Esse convite é seu: mande para a outra pessoa.' });
    await acceptHouseholdInvite(bruno.db, `${invite.code.slice(0, 4)} ${invite.code.slice(4).toLowerCase()}`);
    const h = (await getHousehold(ana.db))!;
    expect(h.members.map((m) => m.name)).toEqual(['Ana', 'Bruno']);

    const casa = await createAccount(ana.db, { name: 'Casa', kind: 'Conta corrente', institution: '', balance: 1000, color: '#C6F432', householdId: h.id });
    await createAccount(ana.db, { name: 'Só da Ana', kind: 'Conta corrente', institution: '', balance: 10, color: '#C6F432' });
    expect(casa).toMatchObject({ householdId: h.id, ownerId: ana.id });
    const tx = await createTransaction(bruno.db, { title: 'Mercado', category: 'Entrada', amount: 50, date: today(), sourceType: 'account', sourceId: casa.id });
    expect(tx).toMatchObject({ householdId: h.id, ownerId: bruno.id });

    const snapB = await loadSnapshot(bruno.db);
    expect(snapB.userId).toBe(bruno.id);
    expect(snapB.household?.id).toBe(h.id);
    expect(snapB.accounts.map((a) => a.name)).toEqual(['Casa']);
    expect(snapB.accounts[0]!.balance).toBe(1050);

    await updateHouseholdSettings(ana.db, { sharePersonal: true, viewScope: 'shared' });
    expect((await loadSnapshot(bruno.db)).accounts.map((a) => a.name).sort()).toEqual(['Casa', 'Só da Ana']);
    expect((await getHousehold(ana.db))!.members[0]).toMatchObject({ sharePersonal: true, viewScope: 'shared' });

    await savePushToken(ana.db, 'ExponentPushToken[teste-ana]', 'ios');
    await savePushToken(ana.db, 'ExponentPushToken[teste-ana]', 'ios');
    const { data: tokens } = await ana.db.from('push_tokens').select('token');
    expect(tokens).toHaveLength(1);

    await leaveHousehold(bruno.db);
    expect(await getHousehold(bruno.db)).toBeNull();
    expect((await loadSnapshot(bruno.db)).accounts).toEqual([]);

    await deleteTestUser(ana);
    await deleteTestUser(bruno);
  });
});
