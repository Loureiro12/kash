import { buildReminderEmail, type DigestRow, type ReminderEmail } from './email.ts';

/** Dependências injetáveis para testar o handler sem rede. */
export interface SendRemindersDeps {
  /** segredo do cron (header `x-kash-cron`); vazio = só o service role autoriza */
  cronSecret?: string;
  /** service role do projeto: `Authorization: Bearer <service role>` também autoriza (testes/manual) */
  serviceKey?: string;
  /** URL do Kash web, para os links do e-mail */
  appUrl: string;
  /** "hoje" no fuso do produto (yyyy-mm-dd) */
  today: () => string;
  getDigest: (day: string) => Promise<DigestRow[]>;
  markSent: (userId: string, day: string, items: number) => Promise<void>;
  /** null quando o envio não está configurado (sem RESEND_API_KEY) */
  sendEmail: ((email: ReminderEmail, idempotencyKey: string) => Promise<void>) | null;
  /** pausa entre envios (limite de taxa do provedor) */
  sleep?: (ms: number) => Promise<void>;
}

/** Resend (plano gratuito) aceita 2 requisições por segundo. */
export const SEND_INTERVAL_MS = 600;

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function authorized(req: Request, deps: SendRemindersDeps): boolean {
  const cron = req.headers.get('x-kash-cron');
  if (deps.cronSecret && cron && cron === deps.cronSecret) return true;
  const auth = req.headers.get('Authorization') ?? '';
  return !!deps.serviceKey && auth === `Bearer ${deps.serviceKey}`;
}

/**
 * POST /send-reminders — envia o e-mail de lembretes do dia para quem ligou a opção.
 * Chamado pelo cron (pg_cron + pg_net, 09:00 de Brasília). Corpo opcional:
 * `{ "dryRun": true }` monta os e-mails sem enviar; `{ "day": "yyyy-mm-dd" }` processa outro dia.
 */
export async function handleSendReminders(req: Request, deps: SendRemindersDeps): Promise<Response> {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  if (!authorized(req, deps)) return json(401, { error: 'unauthorized' });

  let body: { dryRun?: unknown; day?: unknown } = {};
  try {
    const raw = await req.text();
    body = raw ? JSON.parse(raw) : {};
  } catch {
    return json(400, { error: 'invalid_json' });
  }
  const dryRun = body.dryRun === true;
  const day = typeof body.day === 'string' ? body.day : deps.today();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return json(400, { error: 'invalid_day' });
  if (!dryRun && !deps.sendEmail) return json(503, { error: 'email_not_configured' });

  const rows = await deps.getDigest(day);
  const sleep = deps.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const previews: Array<{ to: string; subject: string; items: number }> = [];
  const failures: Array<{ userId: string; error: string }> = [];
  let sent = 0;

  for (const [i, row] of rows.entries()) {
    const email = buildReminderEmail(row, deps.appUrl);
    if (dryRun) {
      previews.push({ to: email.to, subject: email.subject, items: row.items.length });
      continue;
    }
    if (i > 0) await sleep(SEND_INTERVAL_MS);
    try {
      await deps.sendEmail!(email, `kash-reminder-${row.user_id}-${day}`);
      await deps.markSent(row.user_id, day, row.items.length);
      sent += 1;
    } catch (err) {
      failures.push({ userId: row.user_id, error: err instanceof Error ? err.message : String(err) });
    }
  }

  if (failures.length) console.error('send-reminders: falhas', JSON.stringify(failures));
  return json(200, { day, users: rows.length, sent, failed: failures.length, ...(dryRun ? { dryRun: true, previews } : {}) });
}
