import { createAccount, createTransaction, exportMyData, softDeleteTransaction } from '../src';
import { createTestUser, deleteTestUser, today, type TestUser } from './helpers';

describe('exportar dados', () => {
  let u: TestUser;
  beforeAll(async () => {
    u = await createTestUser('export');
  });
  afterAll(() => deleteTestUser(u));

  it('devolve o perfil e todas as coleções da usuária, inclusive lançamentos excluídos', async () => {
    const acc = await createAccount(u.db, { name: 'Conta', kind: 'Poupança', institution: 'Banco', balance: 100, color: '#000000' });
    const tx = await createTransaction(u.db, { title: 'Café', category: 'Comida', amount: -5, date: today(), sourceType: 'account', sourceId: acc.id });
    await softDeleteTransaction(u.db, tx.id);
    const data = await exportMyData(u.db);
    expect(data.format).toBe('kash-export/1');
    expect(data.user).toMatchObject({ id: u.id, email: u.email });
    expect(data.settings).toMatchObject({ currency: 'BRL' });
    expect(data.accounts).toHaveLength(1);
    expect(data.transactions).toHaveLength(1);
    expect(data.transactions[0]!.deleted_at).toBeTruthy();
    expect(Object.keys(data).sort()).toEqual(['accounts', 'bills', 'cards', 'exported_at', 'format', 'goals', 'invoices', 'plans', 'settings', 'transactions', 'user']);
  });
});
