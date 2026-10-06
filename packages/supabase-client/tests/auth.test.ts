import { KashApiError, signIn, signUp, signOut, requestPasswordReset } from '../src';
import { anonClient, createTestUser, deleteTestUser } from './helpers';

describe('auth', () => {
  it('signUp cria o perfil com o nome e signIn entra', async () => {
    const db = anonClient();
    const email = `signup-${Date.now()}@kash.test`;
    const session = await signUp(db, { name: '  Ana  ', email, password: 'senha-123456' });
    expect(session?.user.email).toBe(email);
    const profile = await db.from('profiles').select('name').single();
    expect(profile.data?.name).toBe('Ana');
    await signOut(db);
    const again = await signIn(db, { email, password: 'senha-123456' });
    expect(again.user.id).toBe(session?.user.id);
    await admin_cleanup(session!.user.id);
  });

  it('credencial inválida vira KashApiError(invalid_credentials)', async () => {
    const user = await createTestUser('auth');
    const db = anonClient();
    await expect(signIn(db, { email: user.email, password: 'errada' })).rejects.toMatchObject({ code: 'invalid_credentials' } satisfies Partial<KashApiError>);
    await deleteTestUser(user);
  });

  it('e-mail já cadastrado vira email_taken', async () => {
    const user = await createTestUser('dup');
    await expect(signUp(anonClient(), { name: 'x', email: user.email, password: 'senha-123456' })).rejects.toMatchObject({ code: 'email_taken' });
    await deleteTestUser(user);
  });

  it('reset de senha não lança para e-mail válido', async () => {
    await expect(requestPasswordReset(anonClient(), 'alguem@kash.test')).resolves.toBeUndefined();
  });
});

async function admin_cleanup(id: string) {
  const { admin } = await import('./helpers');
  await admin().auth.admin.deleteUser(id);
}
