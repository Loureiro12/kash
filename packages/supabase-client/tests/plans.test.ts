import { addInstallmentPurchase, createCard, listPlans, listTransactions, movePlanToCard, softDeleteTransaction, undoDeleteTransaction } from '../src';
import { createTestUser, deleteTestUser, type TestUser } from './helpers';

describe('parcelamentos', () => {
  let u: TestUser;
  beforeAll(async () => {
    u = await createTestUser('parcelamentos');
  });
  afterAll(() => deleteTestUser(u));

  it('trocar de cartão move o parcelamento e as parcelas', async () => {
    const a = await createCard(u.db, { name: 'A', last4: '1111', limit: 5000, closingDay: 10, dueDay: 20, gradientId: 'green' });
    const b = await createCard(u.db, { name: 'B', last4: '2222', limit: 5000, closingDay: 10, dueDay: 20, gradientId: 'blue' });
    const planId = await addInstallmentPurchase(u.db, { title: 'Notebook', category: 'Outros', cardId: a.id, total: 2400, installments: 6 });
    await movePlanToCard(u.db, planId, b.id);
    expect((await listPlans(u.db)).find((p) => p.id === planId)?.cardId).toBe(b.id);
    expect((await listTransactions(u.db)).filter((t) => t.planId === planId).every((t) => t.sourceId === b.id)).toBe(true);
  });

  it('excluir o parcelamento some da lista; desfazer traz de volta com o mesmo contador', async () => {
    const card = await createCard(u.db, { name: 'C', last4: '3333', limit: 5000, closingDay: 10, dueDay: 20, gradientId: 'green' });
    const planId = await addInstallmentPurchase(u.db, { title: 'TV', category: 'Outros', cardId: card.id, total: 1200, installments: 12, current: 9 });
    const tx = (await listTransactions(u.db)).find((t) => t.planId === planId)!;
    const group = await softDeleteTransaction(u.db, tx.id, 'plan');
    expect((await listPlans(u.db)).some((p) => p.id === planId)).toBe(false);
    await undoDeleteTransaction(u.db, group);
    expect((await listPlans(u.db)).find((p) => p.id === planId)).toMatchObject({ current: 9, installments: 12 });
  });
});
