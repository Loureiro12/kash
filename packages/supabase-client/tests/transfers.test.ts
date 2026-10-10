import { createAccount, createTransfer, listAccounts, listTransactions, softDeleteTransaction, undoDeleteTransaction, updateTransfer } from '../src';
import { createTestUser, deleteTestUser, today } from './helpers';

describe('transferência entre contas', () => {
  it('cria, edita, exclui as duas pernas e desfaz', async () => {
    const u = await createTestUser('transf');
    const a = await createAccount(u.db, { name: 'Corrente', kind: 'Conta corrente', institution: '', balance: 1000, color: '#C6F432' });
    const b = await createAccount(u.db, { name: 'Poupança', kind: 'Poupança', institution: '', balance: 0, color: '#6BC5FF' });
    const balances = async () => Object.fromEntries((await listAccounts(u.db)).map((x) => [x.name, x.balance]));

    const id = await createTransfer(u.db, { fromAccountId: a.id, toAccountId: b.id, amount: 250, date: today(), title: 'Reserva' });
    expect(await balances()).toEqual({ Corrente: 750, Poupança: 250 });
    const legs = (await listTransactions(u.db)).filter((t) => t.transferId === id);
    expect(legs.map((t) => [t.category, t.amount]).sort()).toEqual([['Transferência', -250], ['Transferência', 250]]);

    await updateTransfer(u.db, id, { fromAccountId: a.id, toAccountId: b.id, amount: 100, date: today(), title: '' });
    expect(await balances()).toEqual({ Corrente: 900, Poupança: 100 });

    const group = await softDeleteTransaction(u.db, legs[0]!.id);
    expect(await balances()).toEqual({ Corrente: 1000, Poupança: 0 });
    expect((await listTransactions(u.db)).filter((t) => t.transferId === id)).toEqual([]);
    await undoDeleteTransaction(u.db, group);
    expect(await balances()).toEqual({ Corrente: 900, Poupança: 100 });

    await expect(createTransfer(u.db, { fromAccountId: a.id, toAccountId: a.id, amount: 10, date: today() })).rejects.toMatchObject({ code: 'validation' });
    await deleteTestUser(u);
  });
});
