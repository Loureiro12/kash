import { createAccount, listAccounts, listTransactions, createTransaction } from '../src';
import { createTestUser, deleteTestUser, today, type TestUser } from './helpers';

let a: TestUser;
let b: TestUser;

beforeAll(async () => {
  a = await createTestUser('a');
  b = await createTestUser('b');
});
afterAll(async () => {
  await deleteTestUser(a);
  await deleteTestUser(b);
});

describe('RLS entre usuários', () => {
  it('cada usuário só vê os próprios dados', async () => {
    const acc = await createAccount(a.db, { name: 'Conta A', kind: 'Conta corrente', institution: '', balance: 100, color: '#fff' });
    await createTransaction(a.db, { title: 'Café', category: 'Comida', amount: 5, date: today(), sourceType: 'account', sourceId: acc.id });
    expect((await listAccounts(a.db)).map((x) => x.name)).toEqual(['Conta A']);
    expect(await listAccounts(b.db)).toEqual([]);
    expect(await listTransactions(b.db)).toEqual([]);
    // B não altera dados de A: update não encontra linha
    const res = await b.db.from('accounts').update({ name: 'hack' }).eq('id', acc.id).select('id');
    expect(res.data).toEqual([]);
    expect((await listAccounts(a.db))[0]?.name).toBe('Conta A');
  });

  it('sem sessão nada é visível', async () => {
    const { anonClient } = await import('./helpers');
    expect(await listAccounts(anonClient())).toEqual([]);
  });
});
