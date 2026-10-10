import { createBill, getProfile, updateSettings } from '../src';
import { admin, createTestUser, deleteTestUser, today } from './helpers';

/** dia do mês daqui a 2 dias (mesma regra do digest: dia 31 vira o último dia do mês) */
function dueDayIn2Days(): { day: string; dueDay: number } {
  const [y, m, d] = today().split('-').map(Number) as [number, number, number];
  const due = new Date(Date.UTC(y, m - 1, d + 2));
  return { day: today(), dueDay: due.getUTCDate() };
}

async function invokeDryRun(day: string) {
  const res = await fetch(`${process.env.SUPABASE_URL}/functions/v1/send-reminders`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ dryRun: true, day }),
  });
  return { status: res.status, body: (await res.json()) as { users: number; previews: Array<{ to: string; subject: string; items: number }> } };
}

describe('lembretes por e-mail', () => {
  it('é opt-in: começa desligado e liga pelo perfil', async () => {
    const u = await createTestUser('lembrete-pref');
    expect((await getProfile(u.db)).settings.emailReminder).toBe(false);
    await updateSettings(u.db, { emailReminder: true });
    expect((await getProfile(u.db)).settings.emailReminder).toBe(true);
    await deleteTestUser(u);
  });

  it('a Edge Function monta o e-mail de quem ligou e tem conta vencendo em 2 dias', async () => {
    const { day, dueDay } = dueDayIn2Days();
    const on = await createTestUser('lembrete-on', 'Ana Lembrete');
    const off = await createTestUser('lembrete-off', 'Bia');
    await updateSettings(on.db, { emailReminder: true });
    await createBill(on.db, { name: 'Internet', amount: 99.9, dueDay, category: 'Assinaturas', source: null });
    await createBill(off.db, { name: 'Luz', amount: 80, dueDay, category: 'Outros', source: null });

    const { status, body } = await invokeDryRun(day);
    expect(status).toBe(200);
    const mine = body.previews.find((p) => p.to === on.email);
    expect(mine).toMatchObject({ items: 1, subject: 'Internet vence em 2 dias (R$ 99,90)' });
    expect(body.previews.some((p) => p.to === off.email)).toBe(false);

    // depois de registrado o envio do dia, não entra de novo
    await admin().rpc('mark_reminder_sent', { p_user_id: on.id, p_day: day, p_items: 1 });
    expect((await invokeDryRun(day)).body.previews.some((p) => p.to === on.email)).toBe(false);

    await deleteTestUser(on);
    await deleteTestUser(off);
  });

  it('usuária comum não chama o digest nem a função', async () => {
    const u = await createTestUser('lembrete-rls');
    const { error } = await u.db.rpc('reminder_digest', { p_day: today() });
    expect(error?.code).toBe('42501');
    const res = await fetch(`${process.env.SUPABASE_URL}/functions/v1/send-reminders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${(await u.db.auth.getSession()).data.session?.access_token}` },
      body: '{}',
    });
    expect(res.status).toBe(401);
    await deleteTestUser(u);
  });
});
