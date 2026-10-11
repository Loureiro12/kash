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
  logCall: (userId: string, usage: ModelResult['usage'], purpose: AiPurpose) => Promise<void>;
  /** null quando a IA não está configurada (sem ANTHROPIC_API_KEY) */
  callModel: ((prompt: ModelPrompt) => Promise<ModelResult>) | null;
}

/** 'import' = ler o PDF inteiro; 'names' = só nomes e categorias de linhas de OFX/CSV (modelo menor) */
export type AiPurpose = 'import' | 'names';
export interface ModelPrompt {
  system: string;
  user: string;
  tool: { name: string };
  purpose: AiPurpose;
}

export const DAILY_LIMIT = 30;
export const MAX_TEXT = 60_000;
/** nomes por pedido (um extrato de mês costuma ter bem menos estabelecimentos diferentes) */
export const MAX_NAMES = 150;

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
    '- Responda SEMPRE chamando a ferramenta registrar_fatura uma única vez, com todas as linhas. Não escreva texto fora dela.',
  ].join('\n');
  return { system, user: `Documento:\n\n${text}`, tool: STATEMENT_TOOL, purpose: 'import' as const };
}

/** Ferramenta da sugestão de nomes: uma resposta por id recebido. */
export const NAMES_TOOL = {
  name: 'sugerir_nomes',
  description: 'Registra o nome amigável e a categoria de cada lançamento recebido.',
  input_schema: {
    type: 'object',
    properties: {
      suggestions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'O id recebido, sem mudar' },
            title: { type: 'string', description: 'Nome amigável do estabelecimento em português (ex.: "PAG*PadariaPaoBom" → "Padaria Pão Bom")' },
            category: { type: 'string', description: 'Uma das categorias da lista, exatamente como escrita, ou vazio' },
          },
          required: ['id'],
        },
      },
    },
    required: ['suggestions'],
  },
};

export function buildNamesPrompt(items: { id: string; description: string }[], categories: string[]) {
  const system = [
    'Você dá nomes amigáveis e categorias para lançamentos de extratos e faturas de bancos brasileiros, usando a ferramenta sugerir_nomes.',
    'Regras:',
    '- title: o nome do estabelecimento como uma pessoa escreveria, sem prefixos de maquininha (PAG*, MP*, EBW*, ZIG*, IFD*…), sem códigos e sem cidade. Ex.: "MP*LOJADOJOAO" → "Loja do João"; "IFD*IFOOD COM AGENCIA" → "iFood".',
    '- Se não reconhecer, apenas organize o texto (separe palavras, primeira letra maiúscula). Não invente marcas.',
    `- category: exatamente uma destas ou vazio: ${categories.join(', ')}.`,
    '- Responda SEMPRE chamando a ferramenta sugerir_nomes uma única vez, com uma sugestão para cada id. Não escreva texto fora dela.',
  ].join('\n');
  const user = `Lançamentos (id: descrição):\n${items.map((i) => `${i.id}: ${i.description}`).join('\n')}`;
  return { system, user, tool: NAMES_TOOL, purpose: 'names' as const };
}

/** Valida as sugestões: só ids enviados, nome curto e categoria da lista da pessoa. */
export function toSuggestions(raw: unknown, ids: Set<string>, categories: string[]): Record<string, { title?: string; category?: string }> {
  const out: Record<string, { title?: string; category?: string }> = {};
  const list = (raw as { suggestions?: unknown } | null)?.suggestions;
  for (const item of Array.isArray(list) ? list : []) {
    const s = item as Record<string, unknown>;
    if (typeof s.id !== 'string' || !ids.has(s.id)) continue;
    const title = typeof s.title === 'string' ? s.title.trim().slice(0, 80) : '';
    const category = typeof s.category === 'string' && categories.includes(s.category) ? s.category : '';
    if (title || category) out[s.id] = { ...(title ? { title } : {}), ...(category ? { category } : {}) };
  }
  return out;
}

/**
 * Motivo da falha da IA, para quem administra ver na aba Rede sem abrir os logs
 * (a pessoa usando o app vê só a mensagem amigável).
 */
export function failureReason(message: string): 'credit' | 'auth' | 'workspace' | 'model' | 'rate_limit' | 'overloaded' | 'unknown' {
  if (/credit balance|billing/i.test(message)) return 'credit';
  if (/workspace/i.test(message)) return 'workspace';
  if (/anthropic 401|anthropic 403|x-api-key|authentication/i.test(message)) return 'auth';
  if (/anthropic 404|model/i.test(message)) return 'model';
  if (/anthropic 429|rate.?limit/i.test(message)) return 'rate_limit';
  if (/anthropic 529|anthropic 5\d\d|overloaded/i.test(message)) return 'overloaded';
  return 'unknown';
}

/**
 * Resumo do erro para diagnóstico (aba Rede): status e mensagem da API, sem nada do pedido.
 * Ex.: "anthropic 400 invalid_request_error: max_tokens: …".
 */
export function failureDetail(message: string): string {
  const status = message.match(/^anthropic (\d{3})/)?.[1];
  const start = message.indexOf('{');
  if (status && start >= 0) {
    try {
      const e = JSON.parse(message.slice(start))?.error;
      if (e && typeof e === 'object') return `anthropic ${status} ${e.type ?? ''}: ${String(e.message ?? '').slice(0, 200)}`.trim();
    } catch {
      // corpo não é JSON: cai no texto puro abaixo
    }
  }
  return message.replace(/sk-ant-[\w-]+/g, '[chave]').slice(0, 200);
}

/** Primeiro objeto JSON com `key` ("lines" ou "suggestions") num texto (plano B quando o modelo não usa a ferramenta). */
export function jsonFromText(text: string, key = 'lines'): Record<string, unknown> | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1];
  const candidates = [fenced, text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)].filter((c): c is string => !!c && c.trim().startsWith('{'));
  for (const c of candidates) {
    try {
      const obj = JSON.parse(c);
      if (obj && typeof obj === 'object' && Array.isArray(obj[key])) return obj;
    } catch {
      // tenta o próximo
    }
  }
  return null;
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
 * POST /import-assist
 * - leitura do PDF: { text, kind: 'card' | 'account', categories } → { statement }. O texto já vem limpo do aparelho.
 * - nomes de OFX/CSV: { mode: 'names', items: [{ id, description }], categories } → { suggestions: { [id]: { title?, category? } } }.
 */
export async function handleImportAssist(req: Request, deps: ImportAssistDeps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  const authorization = req.headers.get('Authorization') ?? '';
  const userId = authorization.startsWith('Bearer ') ? await deps.getUserId(authorization) : null;
  if (!userId) return json(401, { error: 'unauthorized' });
  if (!deps.callModel) return json(503, { error: 'ai_not_configured' });

  let body: { text?: unknown; kind?: unknown; categories?: unknown; mode?: unknown; items?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'invalid_json' });
  }
  if (body.mode === 'names') return suggestNames(userId, body, deps);
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
    return aiFailed(err);
  }
  await deps.logCall(userId, result.usage, 'import');
  return json(200, { statement: toStatement(result.input, kind, categories) });
}

function aiFailed(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error('import-assist: falha na IA', message);
  return json(502, { error: 'ai_failed', reason: failureReason(message), detail: failureDetail(message) });
}

async function suggestNames(userId: string, body: { items?: unknown; categories?: unknown }, deps: ImportAssistDeps): Promise<Response> {
  const categories = Array.isArray(body.categories) ? body.categories.filter((c): c is string => typeof c === 'string').slice(0, 60) : [];
  const items = (Array.isArray(body.items) ? body.items : [])
    .map((i) => i as { id?: unknown; description?: unknown })
    .filter((i): i is { id: string; description: string } => typeof i.id === 'string' && !!i.id.trim() && typeof i.description === 'string' && !!i.description.trim())
    .map((i) => ({ id: i.id.slice(0, 80), description: i.description.trim().slice(0, 120) }));
  if (items.length === 0) return json(400, { error: 'empty_text' });
  if (items.length > MAX_NAMES) return json(413, { error: 'text_too_long' });
  if ((await deps.countRecentCalls(userId)) >= DAILY_LIMIT) return json(429, { error: 'daily_limit' });
  let result: ModelResult;
  try {
    result = await deps.callModel!(buildNamesPrompt(items, categories));
  } catch (err) {
    return aiFailed(err);
  }
  await deps.logCall(userId, result.usage, 'names');
  return json(200, { suggestions: toSuggestions(result.input, new Set(items.map((i) => i.id)), categories) });
}
