/** Linha do digest (ver `public.reminder_digest`). */
export interface DigestItem {
  kind: 'bill' | 'invoice' | 'goal';
  title: string;
  amount: number;
  /** ISO yyyy-mm-dd */
  due: string;
  /** conta fixa: onde é cobrada */
  source?: string | null;
  /** fatura: mês de competência yyyy-mm */
  month?: string;
}

export interface DigestRow {
  user_id: string;
  email: string;
  name: string;
  items: DigestItem[];
}

export interface ReminderEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** Mesmo formato do `formatBRL` do app: "R$ 1.234,50". */
export function formatBRL(value: number): string {
  const cents = Math.round(Math.abs(Number(value)) * 100);
  const int = Math.floor(cents / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${int},${String(cents % 100).padStart(2, '0')}`;
}

/** "2026-10-10" → "10/10" */
const dayMonth = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const monthName = (key: string) => MONTHS[Number(key.slice(5, 7)) - 1] ?? key;

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function itemLine(item: DigestItem): { title: string; detail: string } {
  switch (item.kind) {
    case 'bill':
      return { title: item.title, detail: `${formatBRL(item.amount)} · vence ${dayMonth(item.due)}${item.source ? ` · ${item.source}` : ''}` };
    case 'invoice':
      return { title: `Fatura do ${item.title}`, detail: `${formatBRL(item.amount)} · fatura de ${monthName(item.month ?? item.due)} · vence ${dayMonth(item.due)}` };
    case 'goal':
      return { title: `Guardar pra “${item.title}”`, detail: item.amount > 0 ? `${formatBRL(item.amount)} hoje mantém a meta no ritmo` : 'Hoje é o dia do depósito' };
  }
}

export function subjectFor(items: DigestItem[]): string {
  if (items.length === 1) {
    const [item] = items as [DigestItem];
    if (item.kind === 'bill') return `${item.title} vence em 2 dias (${formatBRL(item.amount)})`;
    if (item.kind === 'invoice') return `Fatura do ${item.title} vence em 2 dias (${formatBRL(item.amount)})`;
    return `Dia de guardar pra “${item.title}”`;
  }
  const dues = items.filter((i) => i.kind !== 'goal').length;
  return dues > 0 ? `${items.length} lembretes do Kash: ${dues === 1 ? '1 vencimento' : `${dues} vencimentos`} em 2 dias` : `${items.length} lembretes do Kash pra hoje`;
}

/** Rota do app que resolve o lembrete (contas fixas, cartões ou metas). */
export function routeFor(items: DigestItem[]): string {
  const kinds = new Set(items.map((i) => i.kind));
  if (kinds.size > 1) return '/app';
  if (kinds.has('bill')) return '/app/contas-fixas';
  if (kinds.has('invoice')) return '/app/cartoes';
  return '/app/metas';
}

/** E-mail do dia para uma pessoa: texto simples + HTML com estilos inline (clientes de e-mail). */
export function buildReminderEmail(row: DigestRow, appUrl: string): ReminderEmail {
  const base = appUrl.replace(/\/$/, '');
  const firstName = row.name.trim().split(/\s+/)[0] || 'oi';
  const lines = row.items.map(itemLine);
  const cta = `${base}${routeFor(row.items)}`;
  const settings = `${base}/app/perfil`;
  const subject = subjectFor(row.items);

  const text = [
    `Oi, ${firstName}!`,
    '',
    ...lines.map((l) => `• ${l.title}: ${l.detail}`),
    '',
    `Abrir o Kash: ${cta}`,
    '',
    `Você recebe este e-mail porque ligou "Lembrete de contas por e-mail" no Kash. Pra desligar: ${settings}`,
  ].join('\n');

  const rows = lines
    .map(
      (l) => `<tr><td style="padding:14px 0;border-bottom:1px solid #ECEEE6">
        <div style="font-weight:600;font-size:15px;color:#14161A">${escapeHtml(l.title)}</div>
        <div style="font-size:13px;color:#61666F;margin-top:2px">${escapeHtml(l.detail)}</div>
      </td></tr>`,
    )
    .join('');

  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#F4F5EF;font-family:Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F5EF;padding:24px 12px"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border-radius:20px;padding:28px">
      <tr><td>
        <div style="display:inline-block;width:36px;height:36px;line-height:36px;text-align:center;border-radius:10px;background:#C6F432;color:#0B0C0E;font-weight:800;font-size:18px">K</div>
        <h1 style="margin:18px 0 6px;font-size:22px;color:#14161A">Oi, ${escapeHtml(firstName)}!</h1>
        <p style="margin:0 0 8px;font-size:14px;color:#61666F">${row.items.length === 1 ? 'Um lembrete pra você não esquecer:' : 'Alguns lembretes pra você não esquecer:'}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
        <p style="margin:22px 0 0"><a href="${escapeHtml(cta)}" style="display:inline-block;background:#C6F432;color:#0B0C0E;text-decoration:none;font-weight:700;font-size:14px;padding:14px 22px;border-radius:14px">Abrir o Kash</a></p>
        <p style="margin:26px 0 0;font-size:12px;line-height:1.5;color:#61666F">Você recebe este e-mail porque ligou “Lembrete de contas por e-mail” no Kash. <a href="${escapeHtml(settings)}" style="color:#456C00">Desligar no Perfil</a>.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  return { to: row.email, subject, html, text };
}
