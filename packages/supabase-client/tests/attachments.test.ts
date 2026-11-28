import { attachmentUrl, base64ToBytes, createAccount, createDebt, createTransaction, listDebts, listTransactions, removeAttachment, resetMyData, settleDebt, uploadAttachment } from '../src';
import { createTestUser, deleteTestUser, today } from './helpers';

// JPEG mínimo (1×1) em base64
const JPEG = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

describe('comprovantes, tags e quem me deve (servidor)', () => {
  it('base64ToBytes decodifica igual ao Buffer', () => {
    expect(Buffer.from(base64ToBytes('SGVsbG8sIEthc2gh')).toString()).toBe('Hello, Kash!');
    expect(Buffer.from(base64ToBytes(JPEG)).equals(Buffer.from(JPEG, 'base64'))).toBe(true);
  });

  it('anexa, gera link, outra pessoa não acessa; trocar apaga o anterior; zerar apaga tudo', async () => {
    const u = await createTestUser('anexo');
    const other = await createTestUser('outro');
    const acc = await createAccount(u.db, { name: 'Conta', kind: 'Conta corrente', institution: '', balance: 100, color: '#C6F432' });
    const tx = await createTransaction(u.db, { title: 'Mercado', category: 'Mercado', amount: 80, date: today(), sourceType: 'account', sourceId: acc.id, tag: 'Viagem' });
    expect(tx.tag).toBe('Viagem');

    const path = await uploadAttachment(u.db, tx.id, JPEG);
    expect(path.startsWith(`${u.id}/${tx.id}/`)).toBe(true);
    expect((await listTransactions(u.db)).find((t) => t.id === tx.id)?.attachmentPath).toBe(path);
    const res = await fetch(await attachmentUrl(u.db, path));
    expect(res.status).toBe(200);

    // outra pessoa: nem lista, nem baixa
    const { data: seen } = await other.db.storage.from('receipts').list(u.id);
    expect(seen ?? []).toEqual([]);
    const { error: denied } = await other.db.storage.from('receipts').download(path);
    expect(denied).not.toBeNull();

    const second = await uploadAttachment(u.db, tx.id, JPEG);
    const { data: files } = await u.db.storage.from('receipts').list(`${u.id}/${tx.id}`);
    expect(files?.map((f) => `${u.id}/${tx.id}/${f.name}`)).toEqual([second]);

    await removeAttachment(u.db, tx.id, second);
    expect((await listTransactions(u.db)).find((t) => t.id === tx.id)?.attachmentPath).toBeUndefined();

    // quem me deve: receber lança a entrada
    const debt = await createDebt(u.db, { person: 'João', description: 'jantar', amount: 30, kind: 'split', date: today(), dueDate: null });
    const income = await settleDebt(u.db, debt.id, acc.id);
    expect((await listTransactions(u.db)).find((t) => t.id === income)).toMatchObject({ title: 'João pagou: jantar', amount: 30 });
    expect((await listDebts(u.db))[0]?.settledAt).toBe(today());

    await uploadAttachment(u.db, tx.id, JPEG);
    await resetMyData(u.db);
    const { data: left } = await u.db.storage.from('receipts').list(u.id);
    expect(left ?? []).toEqual([]);
    expect(await listDebts(u.db)).toEqual([]);

    await deleteTestUser(u);
    await deleteTestUser(other);
  });
});
