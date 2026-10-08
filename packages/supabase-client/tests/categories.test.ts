import { addInstallmentPurchase, createAccount, createBill, createCard, createCategory, createTransaction, deleteCategory, KashApiError, listBills, listCategories, listPlans, listTransactions, updateCategory } from '../src';
import { createTestUser, deleteTestUser, today, type TestUser } from './helpers';

describe('categorias', () => {
  let u: TestUser;
  beforeAll(async () => {
    u = await createTestUser('categorias');
  });
  afterAll(() => deleteTestUser(u));

  it('usuário novo tem as padrão; criar vai para o fim e normaliza a cor', async () => {
    expect((await listCategories(u.db)).map((c) => c.name)).toEqual(['Comida', 'Transporte', 'Lazer', 'Mercado', 'Assinaturas', 'Outros']);
    const pets = await createCategory(u.db, { name: ' Pets ', color: '#ff8a3d' });
    expect(pets).toMatchObject({ name: 'Pets', color: '#FF8A3D' });
    expect((await listCategories(u.db)).at(-1)?.name).toBe('Pets');
    await expect(createCategory(u.db, { name: 'pets', color: '#000000' })).rejects.toMatchObject({ code: 'conflict' } satisfies Partial<KashApiError>);
    await expect(createCategory(u.db, { name: 'Entrada', color: '#000000' })).rejects.toMatchObject({ code: 'validation' });
  });

  it('renomear leva lançamentos, contas fixas e parcelamentos; excluir em uso exige destino', async () => {
    const pets = (await listCategories(u.db)).find((c) => c.name === 'Pets')!;
    const acc = await createAccount(u.db, { name: 'Conta', kind: 'Poupança', institution: 'Banco', balance: 500, color: '#6BC5FF' });
    const card = await createCard(u.db, { name: 'Cartão', last4: '1111', limit: 1000, closingDay: 10, dueDay: 20, gradientId: 'green' });
    await createTransaction(u.db, { title: 'Ração', category: 'Pets', amount: -80, date: today(), sourceType: 'account', sourceId: acc.id });
    await createBill(u.db, { name: 'Plano pet', amount: 39.9, dueDay: 5, category: 'Pets', source: { type: 'card', id: card.id } });
    await addInstallmentPurchase(u.db, { title: 'Arranhador', category: 'Pets', cardId: card.id, total: 300, installments: 3 });

    await updateCategory(u.db, pets.id, { name: 'Bichos', color: '#3DDC97' });
    expect((await listTransactions(u.db)).filter((t) => t.category === 'Bichos')).toHaveLength(2);
    expect((await listBills(u.db)).find((b) => b.name === 'Plano pet')?.category).toBe('Bichos');
    expect((await listPlans(u.db)).find((p) => p.title === 'Arranhador')?.category).toBe('Bichos');

    await expect(deleteCategory(u.db, pets.id)).rejects.toBeInstanceOf(KashApiError);
    await deleteCategory(u.db, pets.id, 'Outros');
    expect((await listCategories(u.db)).some((c) => c.name === 'Bichos')).toBe(false);
    expect((await listTransactions(u.db)).filter((t) => t.category === 'Outros')).toHaveLength(2);
  });
});
