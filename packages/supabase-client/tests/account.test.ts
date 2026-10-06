import { deleteOwnAccount } from '../src';
import { admin, createTestUser } from './helpers';

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
