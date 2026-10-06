import {
  addInstallmentPurchase, createAccount, createBill, createCard, createGoal, createTransaction, deleteAccount, deleteCard,
  ensureRollover, getCardUsage, getProfile, listAccounts, listBills, listCards, listGoals, listInvoices, listTransactions,
  payBill, payInvoice, recordGoalDeposit, softDeleteTransaction, undoDeleteTransaction, unpayBill, updateAccount, updateSettings, updateTransaction, updateUser,
} from '../src';
import { admin, createTestUser, deleteTestUser, today, type TestUser } from './helpers';

let u: TestUser;
beforeAll(async () => {
  u = await createTestUser('repo', 'Lara');
});
afterAll(async () => deleteTestUser(u));

describe('perfil', () => {
  it('nasce com o nome do cadastro e aceita atualizações', async () => {
    const p = await getProfile(u.db);
    expect(p.user).toMatchObject({ name: 'Lara', email: u.email });
    expect(p.settings).toMatchObject({ theme: 'dark', monthlyBudget: 1800, currency: 'BRL' });
    await updateUser(u.db, { name: 'Lara M.', phone: '11 9' });
    await updateSettings(u.db, { theme: 'light', monthlyBudget: 2000 });
    const after = await getProfile(u.db);
    expect(after.user).toMatchObject({ name: 'Lara M.', phone: '11 9' });
    expect(after.settings).toMatchObject({ theme: 'light', monthlyBudget: 2000 });
    expect(await ensureRollover(u.db)).toBe(0);
  });
});

describe('contas, lançamentos e saldo', () => {
  it('saldo = abertura ± lançamentos; editar saldo ajusta a abertura', async () => {
    const acc = await createAccount(u.db, { name: 'Corrente', kind: 'Poupança', institution: 'Banco X', balance: 1000, color: '#6BC5FF' });
    expect(acc).toMatchObject({ kind: 'Poupança · Banco X', balance: 1000 });
    await createTransaction(u.db, { title: 'Mercado', category: 'Mercado', amount: 80, date: today(), sourceType: 'account', sourceId: acc.id });
    await createTransaction(u.db, { title: 'Freela', category: 'Entrada', amount: 500, date: today(), sourceType: 'account', sourceId: acc.id });
    expect((await listAccounts(u.db))[0]?.balance).toBe(1420);
    const edited = await updateAccount(u.db, acc.id, { name: 'Corrente', kind: 'Conta corrente', institution: '', balance: 2000, color: '#fff' });
    expect(edited).toMatchObject({ kind: 'Conta corrente', balance: 2000 });
    const txs = await listTransactions(u.db);
    expect(txs.map((t) => t.amount)).toEqual(expect.arrayContaining([-80, 500]));
    expect(txs[0]?.sourceType).toBe('account');
  });

  it('editar valor mantém o sinal; soft delete e undo', async () => {
    const acc = (await listAccounts(u.db))[0]!;
    const tx = await createTransaction(u.db, { title: 'Lanche', category: 'Comida', amount: 10, date: today(), sourceType: 'account', sourceId: acc.id });
    const updated = await updateTransaction(u.db, tx.id, { amount: 25, title: 'Lanchão' });
    expect(updated).toMatchObject({ amount: -25, title: 'Lanchão' });
    const before = (await listAccounts(u.db))[0]!.balance;
    const group = await softDeleteTransaction(u.db, tx.id);
    expect((await listTransactions(u.db)).some((t) => t.id === tx.id)).toBe(false);
    expect((await listAccounts(u.db))[0]!.balance).toBe(before + 25);
    expect(await undoDeleteTransaction(u.db, group)).toBe(1);
    expect((await listTransactions(u.db)).some((t) => t.id === tx.id)).toBe(true);
  });
});

describe('cartões, parcelas, contas fixas e faturas', () => {
  it('parcelado cria plano e 1ª parcela; fatura atual soma; excluir cartão limpa tudo', async () => {
    const card = await createCard(u.db, { name: 'Principal', last4: '4821', limit: 2500, closingDay: 28, dueDay: 5, gradientId: 'green' });
    expect(card).toMatchObject({ last4: '4821', limit: 2500, gradientId: 'green' });
    const planId = await addInstallmentPurchase(u.db, { title: 'Notebook', category: 'Outros', cardId: card.id, total: 1200, installments: 6 });
    const txs = await listTransactions(u.db);
    expect(txs.find((t) => t.planId === planId)).toMatchObject({ title: 'Notebook (1/6)', amount: -200, sourceType: 'card' });
    expect((await getCardUsage(u.db))[card.id]).toBe(200);

    const bill = await createBill(u.db, { name: 'Internet', amount: 99.9, dueDay: 10, category: 'Assinaturas', source: { type: 'card', id: card.id } });
    expect(bill.paid).toBe(false);
    await payBill(u.db, bill.id);
    expect((await listBills(u.db))[0]).toMatchObject({ paid: true });
    expect((await getCardUsage(u.db))[card.id]).toBe(299.9);
    await unpayBill(u.db, bill.id);
    expect((await listBills(u.db))[0]?.paid).toBe(false);

    // fatura fechada inserida pelo admin (a virada real é testada no pgTAP)
    await admin().from('invoices').insert({ user_id: u.id, card_id: card.id, month: '2026-09', total: 300 });
    const acc = (await listAccounts(u.db))[0]!;
    const before = acc.balance;
    const [inv] = await listInvoices(u.db);
    await payInvoice(u.db, { invoiceId: inv!.id, accountId: acc.id });
    expect((await listInvoices(u.db))[0]).toMatchObject({ paid: true });
    expect((await listAccounts(u.db))[0]!.balance).toBe(before - 300);
    expect((await listTransactions(u.db))[0]).toMatchObject({ category: 'Fatura', amount: -300 });

    await deleteCard(u.db, card.id);
    expect(await listCards(u.db)).toEqual([]);
    expect((await listTransactions(u.db)).some((t) => t.sourceType === 'card')).toBe(false);
    expect((await listBills(u.db))[0]?.sourceId).toBeUndefined();
  });
});

describe('metas', () => {
  it('cria, deposita sem passar do alvo e perde a conta quando ela é excluída', async () => {
    const acc = await createAccount(u.db, { name: 'Poupança', kind: 'Poupança', institution: '', balance: 0, color: '#fff' });
    const goal = await createGoal(u.db, { name: 'Viagem', target: 1000, saved: 100, monthly: 50, color: '#6BC5FF', accountId: acc.id, depositDay: 10 });
    expect(goal).toMatchObject({ saved: 100, accountId: acc.id, depositDay: 10 });
    await recordGoalDeposit(u.db, { goalId: goal.id, amount: 950 });
    const after = (await listGoals(u.db)).find((g) => g.id === goal.id)!;
    expect(after.saved).toBe(1000);
    expect(after.lastDepositDate).toBe(today());
    await deleteAccount(u.db, acc.id);
    expect((await listGoals(u.db)).find((g) => g.id === goal.id)?.accountId).toBeUndefined();
  });
});

describe('erros', () => {
  it('violação de constraint vira KashApiError(validation)', async () => {
    await expect(createCard(u.db, { name: 'x', last4: '12', limit: 100, closingDay: 1, dueDay: 1, gradientId: 'blue' })).rejects.toMatchObject({ code: 'validation' });
  });
});
