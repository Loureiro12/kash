import { RECOVERY_CODE_PATTERN, verifyRecoveryCode, changePassword, KashApiError, parseRecoveryUrl, recoverSessionFromUrl, requestPasswordReset, signIn, signOut, signUp, updatePassword } from '../src';
import { admin, anonClient, createTestUser, deleteTestUser } from './helpers';

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

  it('trocar senha exige a atual correta e a nova diferente; depois entra com a nova', async () => {
    const user = await createTestUser('pwd');
    await expect(changePassword(user.db, { currentPassword: 'errada', newPassword: 'nova-senha-1' })).rejects.toMatchObject({ code: 'invalid_credentials' });
    await expect(changePassword(user.db, { currentPassword: user.password, newPassword: user.password })).rejects.toMatchObject({ code: 'validation' });
    await changePassword(user.db, { currentPassword: user.password, newPassword: 'nova-senha-1' });
    const again = await signIn(anonClient(), { email: user.email, password: 'nova-senha-1' });
    expect(again.user.id).toBe(user.id);
    await deleteTestUser(user);
  });

  it('deep link de recuperação abre sessão e permite definir nova senha', async () => {
    const user = await createTestUser('rec');
    const { data, error } = await admin().auth.admin.generateLink({ type: 'recovery', email: user.email });
    expect(error).toBeNull();
    const url = `kash://reset-password?token_hash=${data.properties!.hashed_token}&type=recovery`;
    expect(parseRecoveryUrl(url)).toEqual({ tokenHash: data.properties!.hashed_token });
    expect(parseRecoveryUrl('kash://outra-coisa')).toBeNull();
    expect(parseRecoveryUrl('kash://reset-password#error=access_denied&error_description=Email+link+is+invalid')).toMatchObject({ error: 'Email link is invalid' });

    const db = anonClient();
    const session = await recoverSessionFromUrl(db, url);
    expect(session?.user.id).toBe(user.id);
    await updatePassword(db, 'recuperada-1');
    // o mesmo link não serve duas vezes
    await expect(recoverSessionFromUrl(anonClient(), url)).rejects.toMatchObject({ code: 'validation' });
    const again = await signIn(anonClient(), { email: user.email, password: 'recuperada-1' });
    expect(again.user.id).toBe(user.id);
    await deleteTestUser(user);
  });

it('código de recuperação abre sessão uma vez só; código errado é validation', async () => {
    const user = await createTestUser('code');
    const { data, error } = await admin().auth.admin.generateLink({ type: 'recovery', email: user.email });
    expect(error).toBeNull();
    const code = data.properties!.email_otp;
    expect(code).toMatch(RECOVERY_CODE_PATTERN);

    await expect(verifyRecoveryCode(anonClient(), user.email, '000000')).rejects.toMatchObject({ code: 'validation' });
    await expect(verifyRecoveryCode(anonClient(), user.email, '12')).rejects.toMatchObject({ code: 'validation' });

    const db = anonClient();
    const session = await verifyRecoveryCode(db, ` ${user.email} `, code.split('').join(' '));
    expect(session.user.id).toBe(user.id);
    await updatePassword(db, 'por-codigo-1');
    await expect(verifyRecoveryCode(anonClient(), user.email, code)).rejects.toMatchObject({ code: 'validation' });
    expect((await signIn(anonClient(), { email: user.email, password: 'por-codigo-1' })).user.id).toBe(user.id);
    await deleteTestUser(user);
  });
});

async function admin_cleanup(id: string) {
  const { admin } = await import('./helpers');
  await admin().auth.admin.deleteUser(id);
}
