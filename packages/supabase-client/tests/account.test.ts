import { deleteOwnAccount, loadSnapshot, resetMyData } from '../src';
import { admin, createTestUser, deleteTestUser } from './helpers';

describe('excluir conta (Edge Function)', () => {
  it('apaga o usuário e seus dados', async () => {
    const u = await createTestUser('del');
    await u.db.from('accounts').insert({ name: 'Conta' });
    await deleteOwnAccount(u.db);
    const { data } = await admin().auth.admin.getUserById(u.id);
    expect(data.user).toBeNull();
    const rows = await admin().from('accounts').select('id').eq('user_id', u.id);
    expect(rows.data).toEqual([]);
  });
});

describe('zerar meus dados', () => {
  it('apaga os dados financeiros e mantém o login e o perfil', async () => {
    const u = await createTestUser('reset', 'Rita');
    await u.db.from('accounts').insert({ name: 'Conta' });
    await u.db.from('goals').insert({ name: 'Viagem', target: 1000, saved: 0, monthly: 50 });
    await resetMyData(u.db);
    const snap = await loadSnapshot(u.db);
    expect(snap.accounts).toEqual([]);
    expect(snap.goals).toEqual([]);
    expect(snap.user.name).toBe('Rita');
    expect(snap.categories.length).toBeGreaterThan(0);
    // a sessão continua valendo: dá pra lançar de novo
    const { error } = await u.db.from('accounts').insert({ name: 'Nova' });
    expect(error).toBeNull();
    await deleteTestUser(u);
  });
});
