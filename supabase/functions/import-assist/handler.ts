import { corsHeaders } from '../_shared/cors.ts';

/** Linha devolvida pela IA (mesmo formato de @kash/importers › ParsedLine). */
export interface AiLine {
  date: string;
  description: string;
  amount: number;
  kind: 'purchase' | 'installment' | 'payment' | 'refund' | 'fee' | 'income' | 'ignore';
  installment?: { current: number; total: number };
  cardLast4?: string;
  suggestedTitle?: string;
  suggestedCategory?: string;
}

export interface AiStatement {
  kind: 'card' | 'account';
  format: 'pdf';
  issuer?: string;
  dueDate?: string;
  statementMonth?: string;
  total?: number;
  cardLast4s: string[];
  lines: AiLine[];
}

export interface ModelResult {
  input: unknown;
  usage: { input_tokens: number; output_tokens: number };
}

export interface ImportAssistDeps {
  /** id do usuário dono do token, ou null */
  getUserId: (authorization: string) => Promise<string | null>;
  /** chamadas de IA da pessoa nas últimas 24 h */
  countRecentCalls: (userId: string) => Promise<number>;
  logCall: (userId: string, usage: ModelResult['usage']) => Promise<void>;
  /** null quando a IA não está configurada (sem ANTHROPIC_API_KEY) */
  callModel: ((prompt: { system: string; user: string; tool: unknown }) => Promise<ModelResult>) | null;
}

export const DAILY_LIMIT = 30;
export const MAX_TEXT = 60_000;

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const KINDS = ['purchase', 'installment', 'payment', 'refund', 'fee', 'income', 'ignore'] as const;

/** Esquema da ferramenta: a IA só responde preenchendo isto (saída estruturada). */
export const STATEMENT_TOOL = {
  name: 'registrar_fatura',
  description: 'Registra os dados e TODAS as linhas de lançamento da fatura/extrato.',
  input_schema: {
    type: 'object',
    properties: {
      issuer: { type: 'string', description: 'Banco/emissor (ex.: Nubank, Itaú, Caixa, Inter)' },
      due_date: { type: 'string', description: 'Vencimento da fatura, AAAA-MM-DD' },
      total: { type: 'number', description: 'Total a pagar informado pelo banco' },
      card_last4s: { type: 'array', items: { type: 'string' }, description: 'Finais de cartão que aparecem (4 dígitos)' },
      lines: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            date: { type: 'string', description: 'AAAA-MM-DD' },
            description: { type: 'string', description: 'Texto da linha exatamente como no documento (sem a cidade)' },
            amount: { type: 'number', description: 'Positivo = débito/compra; negativo = crédito/pagamento/estorno' },
            kind: { type: 'string', enum: [...KINDS] },
            installment_current: { type: 'integer' },
            installment_total: { type: 'integer' },
            card_last4: { type: 'string' },
            suggested_title: { type: 'string', description: 'Nome amigável do estabelecimento em português (ex.: "EBW*Spotify" → "Spotify")' },
            suggested_category: { type: 'string', description: 'Uma das categorias da lista, exatamente como escrita, ou vazio' },
          },
          required: ['date', 'description', 'amount', 'kind'],
        },
      },
    },
    required: ['lines'],
  },
};

export function buildPrompt(text: string, kind: 'card' | 'account', categories: string[]) {
  const system = [
    `Você lê ${kind === 'card' ? 'faturas de cartão de crédito' : 'extratos de conta'} de bancos brasileiros e registra os lançamentos com a ferramenta registrar_fatura.`,
    'Regras:',
    '- Registre TODAS as linhas de lançamento do período (compras, parcelas, IOF, juros, multas, pagamentos, estornos), de todos os cartões da fatura.',
    '- Valores em reais: compra/débito positivo; pagamento, estorno, ajuste de crédito e cashback negativos. Use o valor em R$ (não o em dólar).',
    '- kind: "installment" para parcela ("Parcela 2/12", "02 DE 05", "03/12", "Parcela 03 de 06"), preenchendo installment_current e installment_total; "fee" para IOF, juros, multa, mora, anuidade, tarifas; "payment" para pagamento da fatura; "refund" para estorno/ajuste/crédito; "purchase" para compra à vista; "income" para crédito em conta.',
    '- Linhas que listam parcelas de PRÓXIMAS faturas, totais, subtotais, saldo anterior e simulações de parcelamento NÃO são lançamentos: não registre (ou use kind "ignore").',
    '- Datas sem ano: use o ano do vencimento; se o mês da linha for maior que o do vencimento, é do ano anterior. Parcelas costumam trazer a data da compra original: mantenha.',
    '- description: copie o texto do estabelecimento como está, sem a cidade, sem o final do cartão e sem o "R$".',
    `- suggested_category: escolha exatamente uma destas ou deixe vazio: ${categories.join(', ')}.`,
    '- O texto já teve CPF, endereço e nome do titular removidos (aparece como TITULAR). Não invente linhas.',
  ].join('\n');
  return { system, user: `Documento:\n\n${text}`, tool: STATEMENT_TOOL };
}

/**
 * Motivo da falha da IA, para quem administra ver na aba Rede sem abrir os logs
 * (a pessoa usando o app vê só a mensagem amigável).
 */
export function failureReason(message: string): 'credit' | 'auth' | 'model' | 'rate_limit' | 'overloaded' | 'unknown' {
  if (/credit balance|billing/i.test(message)) return 'credit';
  if (/anthropic 401|anthropic 403|x-api-key|authentication/i.test(message)) return 'auth';
  if (/anthropic 404|model/i.test(message)) return 'model';
  if (/anthropic 429|rate.?limit/i.test(message)) return 'rate_limit';
  if (/anthropic 529|anthropic 5\d\d|overloaded/i.test(message)) return 'overloaded';
  return 'unknown';
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Valida a resposta da IA: o que não tiver o formato certo é descartado (nunca confiamos às cegas). */
export function toStatement(raw: unknown, kind: 'card' | 'account', categories: string[]): AiStatement {
  const r = (raw ?? {}) as Record<string, unknown>;
  const lines: AiLine[] = [];
  for (const item of Array.isArray(r.lines) ? r.lines : []) {
    const l = item as Record<string, unknown>;
    const amount = Number(l.amount);
    const kindValue = KINDS.includes(l.kind as (typeof KINDS)[number]) ? (l.kind as AiLine['kind']) : null;
    if (typeof l.date !== 'string' || !ISO.test(l.date) || typeof l.description !== 'string' || !l.description.trim() || !Number.isFinite(amount) || amount === 0 || !kindValue) continue;
    const cur = Number(l.installment_current);
    const tot = Number(l.installment_total);
    const hasInst = Number.isInteger(cur) && Number.isInteger(tot) && tot >= 2 && tot <= 48 && cur >= 1 && cur <= tot;
    const cat = typeof l.suggested_category === 'string' && categories.includes(l.suggested_category) ? l.suggested_category : undefined;
    lines.push({
      date: l.date,
      description: l.description.trim().slice(0, 200),
      amount: Math.round(amount * 100) / 100,
      kind: kindValue === 'installment' && !hasInst ? 'purchase' : kindValue,
      ...(hasInst && (kindValue === 'installment' || kindValue === 'fee') ? { installment: { current: cur, total: tot } } : {}),
      ...(typeof l.card_last4 === 'string' && /^\d{4}$/.test(l.card_last4) ? { cardLast4: l.card_last4 } : {}),
      ...(typeof l.suggested_title === 'string' && l.suggested_title.trim() ? { suggestedTitle: l.suggested_title.trim().slice(0, 80) } : {}),
      ...(cat ? { suggestedCategory: cat } : {}),
    });
  }
  const dueDate = typeof r.due_date === 'string' && ISO.test(r.due_date) ? r.due_date : undefined;
  const total = Number(r.total);
  return {
    kind,
    format: 'pdf',
    ...(typeof r.issuer === 'string' && r.issuer.trim() ? { issuer: r.issuer.trim().slice(0, 60) } : {}),
    ...(dueDate ? { dueDate } : {}),
    ...(Number.isFinite(total) && total > 0 ? { total: Math.round(total * 100) / 100 } : {}),
    cardLast4s: (Array.isArray(r.card_last4s) ? r.card_last4s : []).filter((x): x is string => typeof x === 'string' && /^\d{4}$/.test(x)),
    lines,
  };
}

/**
 * POST /import-assist — lê com IA o texto (já limpo no aparelho) de um PDF de fatura/extrato.
 * Corpo: { text, kind: 'card' | 'account', categories: string[] }.
 */
export async function handleImportAssist(req: Request, deps: ImportAssistDeps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  const authorization = req.headers.get('Authorization') ?? '';
  const userId = authorization.startsWith('Bearer ') ? await deps.getUserId(authorization) : null;
  if (!userId) return json(401, { error: 'unauthorized' });
  if (!deps.callModel) return json(503, { error: 'ai_not_configured' });

  let body: { text?: unknown; kind?: unknown; categories?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'invalid_json' });
  }
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  const kind = body.kind === 'account' ? 'account' : 'card';
  const categories = Array.isArray(body.categories) ? body.categories.filter((c): c is string => typeof c === 'string').slice(0, 60) : [];
  if (text.length < 20) return json(400, { error: 'empty_text' });
  if (text.length > MAX_TEXT) return json(413, { error: 'text_too_long' });
  if ((await deps.countRecentCalls(userId)) >= DAILY_LIMIT) return json(429, { error: 'daily_limit' });

  let result: ModelResult;
  try {
    result = await deps.callModel(buildPrompt(text, kind, categories));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('import-assist: falha na IA', message);
    return json(502, { error: 'ai_failed', reason: failureReason(message) });
  }
  await deps.logCall(userId, result.usage);
  return json(200, { statement: toStatement(result.input, kind, categories) });
}
