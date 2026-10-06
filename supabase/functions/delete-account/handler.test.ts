import { assertEquals } from 'jsr:@std/assert@1';
import { handleDeleteAccount, type DeleteAccountDeps } from './handler.ts';

const deps = (overrides: Partial<DeleteAccountDeps> = {}): DeleteAccountDeps & { deleted: string[] } => {
  const deleted: string[] = [];
  return {
    deleted,
    getUserId: async (auth) => (auth === 'Bearer valid' ? 'user-1' : null),
    deleteUser: async (id) => {
      deleted.push(id);
    },
    ...overrides,
  };
};

Deno.test('responde ao preflight CORS', async () => {
  const res = await handleDeleteAccount(new Request('http://x', { method: 'OPTIONS' }), deps());
  assertEquals(res.status, 200);
});

Deno.test('rejeita método que não seja POST', async () => {
  const res = await handleDeleteAccount(new Request('http://x', { method: 'GET' }), deps());
  assertEquals(res.status, 405);
});

Deno.test('sem token ou token inválido → 401 e nada é apagado', async () => {
  const d = deps();
  const noToken = await handleDeleteAccount(new Request('http://x', { method: 'POST' }), d);
  const bad = await handleDeleteAccount(new Request('http://x', { method: 'POST', headers: { Authorization: 'Bearer nope' } }), d);
  assertEquals(noToken.status, 401);
  assertEquals(bad.status, 401);
  assertEquals(d.deleted, []);
});

Deno.test('token válido apaga o próprio usuário', async () => {
  const d = deps();
  const res = await handleDeleteAccount(new Request('http://x', { method: 'POST', headers: { Authorization: 'Bearer valid' } }), d);
  assertEquals(res.status, 200);
  assertEquals(await res.json(), { ok: true });
  assertEquals(d.deleted, ['user-1']);
});
