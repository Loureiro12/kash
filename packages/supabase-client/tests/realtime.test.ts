import { createBill, subscribeToUserChanges, type UserChange } from '../src';
import { createTestUser, deleteTestUser, type TestUser } from './helpers';
import { createKashClient } from '../src/client';

/** segundo "aparelho" logado na mesma conta */
async function secondDevice(u: TestUser) {
  const db = createKashClient({ url: process.env.SUPABASE_URL!, anonKey: process.env.SUPABASE_ANON_KEY!, options: { auth: { persistSession: false, autoRefreshToken: false } } });
  const { error } = await db.auth.signInWithPassword({ email: u.email, password: u.password });
  if (error) throw error;
  return db;
}

function listen(u: TestUser, userId = u.id) {
  const changes: UserChange[] = [];
  const statuses: string[] = [];
  let ready!: () => void;
  const subscribed = new Promise<void>((r) => (ready = r));
  const stop = subscribeToUserChanges(u.db, userId, { onChange: (c) => changes.push(c), onSubscribed: () => ready(), onStatus: (s) => statuses.push(s) });
  return { changes, statuses, subscribed, stop };
}

const waitFor = async (check: () => boolean, ms = 8000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (check()) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return check();
};

describe('sincronização em tempo real', () => {
  it('escrita em outro aparelho chega como aviso no canal do usuário', async () => {
    const u = await createTestUser('rt');
    const l = listen(u);
    await l.subscribed;
    const other = await secondDevice(u);
    await createBill(other, { name: 'Internet', amount: 99.9, dueDay: 10, category: 'Assinaturas', source: null });
    expect(await waitFor(() => l.changes.some((c) => c.table === 'bills' && c.op === 'insert'))).toBe(true);
    l.stop();
    await deleteTestUser(u);
  }, 20000);

  it('outra pessoa não recebe os avisos (canal privado)', async () => {
    const ana = await createTestUser('rt-ana');
    const bia = await createTestUser('rt-bia');
    const spy = listen(bia, ana.id);
    await createBill(ana.db, { name: 'Luz', amount: 80, dueDay: 5, category: 'Outros', source: null });
    await new Promise((r) => setTimeout(r, 2500));
    expect(spy.changes).toEqual([]);
    expect(spy.statuses).not.toContain('SUBSCRIBED');
    spy.stop();
    await deleteTestUser(ana);
    await deleteTestUser(bia);
  }, 20000);
});
