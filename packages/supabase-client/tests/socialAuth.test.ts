import { parseOAuthRedirect, sessionFromOAuthRedirect, signIn, socialSignInUrl } from '../src';
import { anonClient, createTestUser, deleteTestUser } from './helpers';

describe('login social (Apple e Google)', () => {
  it('URL do provedor volta para o app e o Google sempre pergunta a conta', async () => {
    const url = new URL(await socialSignInUrl(anonClient(), 'google', 'kash://auth-callback'));
    expect(url.pathname).toMatch(/\/auth\/v1\/authorize$/);
    expect(url.searchParams.get('provider')).toBe('google');
    expect(url.searchParams.get('redirect_to')).toBe('kash://auth-callback');
    expect(url.searchParams.get('prompt')).toBe('select_account');
    const apple = new URL(await socialSignInUrl(anonClient(), 'apple', 'https://www.kash.app.br/entrar/retorno'));
    expect([apple.searchParams.get('provider'), apple.searchParams.get('prompt')]).toEqual(['apple', null]);
  });

  it('lê o retorno: código (PKCE), tokens (implícito), erro do provedor ou nada', () => {
    expect(parseOAuthRedirect('kash://auth-callback?code=abc')).toEqual({ code: 'abc' });
    expect(parseOAuthRedirect('kash://auth-callback#access_token=a&refresh_token=r&expires_in=3600')).toEqual({ accessToken: 'a', refreshToken: 'r' });
    expect(parseOAuthRedirect('https://www.kash.app.br/entrar/retorno?error=access_denied&error_description=User+cancelled')).toEqual({ error: 'User cancelled' });
    expect(parseOAuthRedirect('kash://auth-callback')).toBeNull();
  });

  it('abre a sessão com os tokens do retorno; erro do provedor vira mensagem clara', async () => {
    const user = await createTestUser('social');
    const session = await signIn(anonClient(), { email: user.email, password: user.password });
    const fresh = anonClient();
    const opened = await sessionFromOAuthRedirect(fresh, `kash://auth-callback#access_token=${session.access_token}&refresh_token=${session.refresh_token}&token_type=bearer`);
    expect(opened?.user.id).toBe(user.id);
    expect((await fresh.auth.getUser()).data.user?.id).toBe(user.id);
    await expect(sessionFromOAuthRedirect(anonClient(), 'kash://auth-callback?error=access_denied')).rejects.toMatchObject({ code: 'validation' });
    expect(await sessionFromOAuthRedirect(anonClient(), 'kash://auth-callback')).toBeNull();
    await deleteTestUser(user);
  });
});

describe('como a pessoa entra', () => {
  it('quem tem e-mail tem senha; só Apple/Google não', async () => {
    const { socialOnlyLabel } = await import('../src');
    expect(socialOnlyLabel(['email', 'google'])).toBeNull();
    expect(socialOnlyLabel(['google'])).toBe('Google');
    expect(socialOnlyLabel(['apple', 'google'])).toBe('Apple ou Google');
  });
});
