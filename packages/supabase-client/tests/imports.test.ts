import { createAccount, createCard, importAccountStatement, importCardStatement, listAccounts, listImports, listTransactions, listMerchantRules, listPlans, readStatementWithAi, saveMerchantRules, undoImport } from '../src';
import { createTestUser, deleteTestUser, today } from './helpers';

describe('importar fatura e extrato', () => {
  it('fatura: parcelamento + compra, histórico, regras e desfazer', async () => {
    const u = await createTestUser('import');
    const card = await createCard(u.db, { name: 'Nubank', last4: '1670', limit: 6400, closingDay: 5, dueDay: 13, gradientId: 'purple' });
    const id = await importCardStatement(u.db, {
      cardId: card.id,
      fileName: 'fatura.csv',
      format: 'csv',
      statementMonth: today().slice(0, 7),
      items: [
        { type: 'plan', title: 'Celular', original_title: 'LOJA X - Parcela 2/10', category: 'Outros', per: 100, installments: 10, current: 2, current_date: today(), external_id: 'p1' },
        { type: 'tx', title: 'Spotify', original_title: 'EBW*Spotify', category: 'Assinaturas', amount: 21.9, date: today(), external_id: 't1' },
      ],
    });
    const [record] = await listImports(u.db);
    expect(record).toMatchObject({ id, sourceType: 'card', txCount: 1, planCount: 1, skippedCount: 0, undone: false });
    expect((await listPlans(u.db)).map((p) => [p.title, p.current, p.installments])).toEqual([['Celular', 2, 10]]);

    await saveMerchantRules(u.db, [{ pattern: 'spotify', title: 'Spotify', category: 'Assinaturas' }]);
    await saveMerchantRules(u.db, [{ pattern: 'spotify', title: 'Spotify Família', category: 'Assinaturas' }]);
    expect(await listMerchantRules(u.db)).toEqual([{ pattern: 'spotify', title: 'Spotify Família', category: 'Assinaturas' }]);

    await undoImport(u.db, id);
    expect(await listPlans(u.db)).toEqual([]);
    expect((await listImports(u.db))[0]?.undone).toBe(true);
    await deleteTestUser(u);
  });

  it('extrato mantendo o saldo de hoje', async () => {
    const u = await createTestUser('import-acc');
    const acc = await createAccount(u.db, { name: 'Corrente', kind: 'Conta corrente', institution: '', balance: 500, color: '#C6F432' });
    await importAccountStatement(u.db, { accountId: acc.id, fileName: 'extrato.ofx', format: 'ofx', keepBalance: true, items: [{ title: 'Salário', original_title: 'PIX', category: 'Outros', amount: 2000, date: today(), external_id: 'f1' }] });
    expect((await listAccounts(u.db))[0]?.balance).toBe(500);
    await deleteTestUser(u);
  });

  it('extrato com transferência para outra conta: as duas pernas, saldos mantidos e desfazer', async () => {
    const u = await createTestUser('import-transfer');
    const corrente = await createAccount(u.db, { name: 'Corrente', kind: 'Conta corrente', institution: '', balance: 1000, color: '#C6F432' });
    const poupanca = await createAccount(u.db, { name: 'Poupança', kind: 'Poupança', institution: '', balance: 3000, color: '#5B8CFF' });
    const id = await importAccountStatement(u.db, {
      accountId: corrente.id,
      fileName: 'extrato.csv',
      format: 'csv',
      keepBalance: true,
      items: [{ type: 'transfer', title: 'Para a poupança', original_title: 'APLICACAO POUPANCA', category: 'Transferência', amount: -400, date: today(), external_id: 'f1', counterpart_account_id: poupanca.id }],
    });
    const legs = await listTransactions(u.db);
    expect(legs.map((t) => [t.sourceId, t.amount, t.category]).sort()).toEqual([
      [corrente.id, -400, 'Transferência'],
      [poupanca.id, 400, 'Transferência'],
    ].sort());
    expect(legs[0]?.transferId).toBe(legs[1]?.transferId);
    expect((await listAccounts(u.db)).map((a) => a.balance)).toEqual([1000, 3000]);

    await undoImport(u.db, id);
    expect(await listTransactions(u.db)).toEqual([]);
    expect((await listAccounts(u.db)).map((a) => a.balance)).toEqual([1000, 3000]);
    await deleteTestUser(u);
  });

  it('leitura de PDF sem a chave da IA responde com mensagem clara', async () => {
    const u = await createTestUser('import-ai');
    await expect(readStatementWithAi(u.db, { text: 'Fatura de teste com algumas linhas de lançamento', kind: 'card', categories: ['Outros'] })).rejects.toMatchObject({
      message: 'A leitura de PDF ainda não está disponível. Use o arquivo OFX ou CSV do seu banco.',
    });
    await deleteTestUser(u);
  });
});
