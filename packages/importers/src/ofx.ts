import { classifyLine, detectInstallment } from './normalize';
import type { ParsedLine, ParsedStatement } from './types';

/** Valor de uma tag OFX (SGML sem fechamento ou XML com fechamento). */
function tag(block: string, name: string): string | undefined {
  const m = block.match(new RegExp(`<${name}>([^<\\r\\n]*)`, 'i'));
  return m?.[1]?.trim() || undefined;
}

/** "20261005120000[-3:BRT]" → "2026-10-05" */
function ofxDate(raw: string | undefined): string | null {
  const m = raw?.match(/^(\d{4})(\d{2})(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

const decodeEntities = (s: string) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");

/**
 * Lê um OFX (extrato de conta ou fatura de cartão). Padrão do OFX: valor negativo = saída.
 * No Kash, `amount` > 0 = saída, então o sinal é invertido.
 */
export function parseOfx(text: string): ParsedStatement {
  const isCard = /<CREDITCARDMSGSRSV1>|<CCSTMTRS>/i.test(text);
  const kind = isCard ? 'card' : 'account';
  const blocks = text.split(/<STMTTRN>/i).slice(1).map((b) => b.split(/<\/STMTTRN>/i)[0] ?? b);
  const lines: ParsedLine[] = [];
  for (const block of blocks) {
    const date = ofxDate(tag(block, 'DTPOSTED'));
    const raw = Number((tag(block, 'TRNAMT') ?? '').replace(',', '.'));
    if (!date || !Number.isFinite(raw) || raw === 0) continue;
    const name = tag(block, 'NAME');
    const memo = tag(block, 'MEMO');
    const description = decodeEntities([name, memo && memo !== name ? memo : undefined].filter(Boolean).join(' - ') || 'Lançamento');
    const amount = Math.round(-raw * 100) / 100;
    const installment = detectInstallment(description);
    lines.push({
      date,
      description,
      amount,
      kind: classifyLine(description, amount, kind),
      ...(installment && isCard ? { installment: { current: installment.current, total: installment.total } } : {}),
      ...(tag(block, 'FITID') ? { bankId: tag(block, 'FITID') } : {}),
    });
  }
  const acct = text.match(/<ACCTID>([^<\r\n]+)/i)?.[1]?.trim();
  return {
    kind,
    format: 'ofx',
    issuer: tag(text, 'ORG'),
    cardLast4s: acct && isCard ? [acct.replace(/\D/g, '').slice(-4)].filter(Boolean) : [],
    lines: lines.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)),
  };
}
