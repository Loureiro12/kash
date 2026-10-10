import { assert, assertEquals, assertStringIncludes } from 'jsr:@std/assert@1';
import { buildReminderEmail, formatBRL, subjectFor, type DigestRow } from './email.ts';
import { handleSendReminders, type SendRemindersDeps } from './handler.ts';

const ana: DigestRow = {
  user_id: 'u-ana',
  email: 'ana@test.com',
  name: 'Ana Souza',
  items: [
    { kind: 'bill', title: 'Internet', amount: 99.9, due: '2026-10-10', source: 'Corrente' },
    { kind: 'invoice', title: 'Roxo', amount: 1450, due: '2026-10-10', month: '2026-09' },
    { kind: 'goal', title: 'Viagem', amount: 50, due: '2026-10-08' },
  ],
};
const bia: DigestRow = { user_id: 'u-bia', email: 'bia@test.com', name: 'Bia', items: [{ kind: 'bill', title: 'Aluguel <casa>', amount: 900, due: '2026-10-10' }] };

function deps(overrides: Partial<SendRemindersDeps> = {}) {
  const sent: Array<{ to: string; subject: string; key: string }> = [];
  const marked: string[] = [];
  const d: SendRemindersDeps = {
    cronSecret: 'cron-123',
    serviceKey: 'service-abc',
    appUrl: 'https://www.kash.app.br/',
    today: () => '2026-10-08',
    getDigest: async () => [ana, bia],
    markSent: async (userId, day, items) => {
      marked.push(`${userId}:${day}:${items}`);
    },
    sendEmail: async (email, key) => {
      sent.push({ to: email.to, subject: email.subject, key });
    },
    sleep: async () => {},
    ...overrides,
  };
  return { d, sent, marked };
}

const post = (headers: Record<string, string> = { 'x-kash-cron': 'cron-123' }, body?: unknown) =>
  new Request('http://x', { method: 'POST', headers, body: body === undefined ? undefined : JSON.stringify(body) });

Deno.test('só aceita POST', async () => {
  const res = await handleSendReminders(new Request('http://x', { method: 'GET' }), deps().d);
  assertEquals(res.status, 405);
});

Deno.test('sem o segredo do cron nem o service role → 401 e nada é enviado', async () => {
  const { d, sent } = deps();
  const attempts: Array<Record<string, string>> = [{}, { 'x-kash-cron': 'errado' }, { Authorization: 'Bearer anon' }];
  for (const headers of attempts) {
    assertEquals((await handleSendReminders(post(headers), d)).status, 401);
  }
  // segredo do cron não configurado: header vazio não pode passar
  assertEquals((await handleSendReminders(post({ 'x-kash-cron': '' }), deps({ cronSecret: '' }).d)).status, 401);
  assertEquals(sent, []);
});

Deno.test('envia um e-mail por pessoa e registra o envio do dia', async () => {
  const { d, sent, marked } = deps();
  const res = await handleSendReminders(post(), d);
  assertEquals(res.status, 200);
  assertEquals(await res.json(), { day: '2026-10-08', users: 2, sent: 2, failed: 0 });
  assertEquals(sent.map((s) => s.to), ['ana@test.com', 'bia@test.com']);
  assertEquals(sent[0]!.key, 'kash-reminder-u-ana-2026-10-08');
  assertEquals(marked, ['u-ana:2026-10-08:3', 'u-bia:2026-10-08:1']);
});

Deno.test('service role também autoriza; dryRun só monta os e-mails', async () => {
  const { d, sent, marked } = deps();
  const res = await handleSendReminders(post({ Authorization: 'Bearer service-abc' }, { dryRun: true, day: '2026-11-28' }), d);
  const body = await res.json();
  assertEquals(body.day, '2026-11-28');
  assertEquals(body.previews.length, 2);
  assertEquals(sent, []);
  assertEquals(marked, []);
});

Deno.test('falha no envio de uma pessoa não derruba as outras nem marca como enviado', async () => {
  const { d, marked } = deps({
    sendEmail: async (email) => {
      if (email.to === 'ana@test.com') throw new Error('resend 550');
    },
  });
  const body = await (await handleSendReminders(post(), d)).json();
  assertEquals(body, { day: '2026-10-08', users: 2, sent: 1, failed: 1 });
  assertEquals(marked, ['u-bia:2026-10-08:1']);
});

Deno.test('sem provedor configurado: 503 (o dryRun continua funcionando)', async () => {
  const { d } = deps({ sendEmail: null });
  assertEquals((await handleSendReminders(post(), d)).status, 503);
  assertEquals((await handleSendReminders(post(undefined, { dryRun: true }), d)).status, 200);
});

Deno.test('dia inválido e JSON inválido → 400', async () => {
  const { d } = deps();
  assertEquals((await handleSendReminders(post(undefined, { day: '08/10/2026' }), d)).status, 400);
  const bad = new Request('http://x', { method: 'POST', headers: { 'x-kash-cron': 'cron-123' }, body: '{' });
  assertEquals((await handleSendReminders(bad, d)).status, 400);
});

Deno.test('conteúdo do e-mail: itens, links e saudação', () => {
  const email = buildReminderEmail(ana, 'https://www.kash.app.br/');
  assertEquals(email.subject, '3 lembretes do Kash: 2 vencimentos em 2 dias');
  assertStringIncludes(email.text, 'Oi, Ana!');
  assertStringIncludes(email.text, '• Internet: R$ 99,90 · vence 10/10 · Corrente');
  assertStringIncludes(email.text, '• Fatura do Roxo: R$ 1.450,00 · fatura de setembro · vence 10/10');
  assertStringIncludes(email.text, '• Guardar pra “Viagem”: R$ 50,00 hoje mantém a meta no ritmo');
  assertStringIncludes(email.html, 'href="https://www.kash.app.br/app"');
  assertStringIncludes(email.html, 'https://www.kash.app.br/app/perfil');
});

Deno.test('um item só: assunto direto e link para a tela certa; nomes são escapados', () => {
  const email = buildReminderEmail(bia, 'https://www.kash.app.br');
  assertEquals(email.subject, 'Aluguel <casa> vence em 2 dias (R$ 900,00)');
  assertStringIncludes(email.html, 'Aluguel &lt;casa&gt;');
  assert(!email.html.includes('<casa>'));
  assertStringIncludes(email.html, 'href="https://www.kash.app.br/app/contas-fixas"');
  assertEquals(subjectFor([{ kind: 'goal', title: 'Viagem', amount: 0, due: '2026-10-08' }]), 'Dia de guardar pra “Viagem”');
  assertEquals(formatBRL(1234567.8), 'R$ 1.234.567,80');
});
