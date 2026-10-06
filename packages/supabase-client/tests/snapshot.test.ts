import { loadSnapshot } from '../src';
import { anonClient } from './helpers';

describe('snapshot da usuária do seed', () => {
  it('carrega tudo em paralelo com os números do app', async () => {
    const db = anonClient();
    const { error } = await db.auth.signInWithPassword({ email: 'lara@email.com', password: '123456' });
    expect(error).toBeNull();
    const snap = await loadSnapshot(db);
    expect(snap.user).toMatchObject({ name: 'Lara Mendes', email: 'lara@email.com' });
    expect(snap.accounts.map((a) => a.balance)).toEqual([2340.5, 1800, 85]);
    expect(snap.cards).toHaveLength(2);
    expect(snap.cardUsage['c0000000-0000-4000-8000-000000000001']).toBe(405.1);
    expect(snap.txs[0]).toMatchObject({ id: 'f0000000-0000-4000-8000-000000000001', title: 'Almoço no RU' });
    expect(snap.bills.filter((b) => b.paid)).toHaveLength(1);
    expect(snap.goals).toHaveLength(3);
    expect(snap.invoices[0]).toMatchObject({ id: 'e0000000-0000-4000-8000-000000000001', total: 1240.3, paid: false });
    expect(snap.plans).toHaveLength(2);
    await db.auth.signOut();
  });
});
