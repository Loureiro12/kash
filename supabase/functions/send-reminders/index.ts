import { createClient } from 'npm:@supabase/supabase-js@2';
import type { DigestRow } from './email.ts';
import { handleSendReminders } from './handler.ts';

const url = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const resendKey = Deno.env.get('RESEND_API_KEY');
const from = Deno.env.get('REMINDERS_FROM');

const db = createClient(url, serviceKey, { auth: { persistSession: false } });

/** "Hoje" em Brasília (o mesmo fuso de `public.kash_today()`). */
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

Deno.serve((req) =>
  handleSendReminders(req, {
    cronSecret: Deno.env.get('REMINDERS_CRON_SECRET'),
    serviceKey,
    appUrl: Deno.env.get('APP_URL') ?? 'https://www.kash.app.br',
    today,
    getDigest: async (day) => {
      const { data, error } = await db.rpc('reminder_digest', { p_day: day });
      if (error) throw error;
      return (data ?? []) as DigestRow[];
    },
    markSent: async (userId, day, items) => {
      const { error } = await db.rpc('mark_reminder_sent', { p_user_id: userId, p_day: day, p_items: items });
      if (error) throw error;
    },
    sendEmail:
      resendKey && from
        ? async (email, idempotencyKey) => {
            const res = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
              body: JSON.stringify({ from, to: [email.to], subject: email.subject, html: email.html, text: email.text }),
            });
            if (!res.ok) throw new Error(`resend ${res.status}: ${await res.text()}`);
          }
        : null,
  }),
);
