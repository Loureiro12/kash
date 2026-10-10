import { assertEquals, assertStringIncludes } from 'jsr:@std/assert@1';
import { buildPrompt, DAILY_LIMIT, failureReason, handleImportAssist, toStatement, type ImportAssistDeps } from './handler.ts';

const categories = ['Comida', 'Assinaturas', 'Outros'];
const aiOutput = {
  issuer: 'Nubank',
  due_date: '2026-10-13',
  total: 567.71,
  card_last4s: ['1670', 'abc'],
  lines: [
    { date: '2026-09-05', description: 'Dm*Streamingx - Parcela 2/12', amount: 22.9, kind: 'installment', installment_current: 2, installment_total: 12, suggested_title: 'Streaming X', suggested_category: 'Assinaturas' },
    { date: '2026-09-13', description: 'EBW*Spotify - NuPay', amount: 23.9, kind: 'purchase', suggested_category: 'Inventada' },
    { date: '2026-09-14', description: 'Pagamento em 14 SET', amount: -558.95, kind: 'payment' },
    { date: '14/09/2026', description: 'data inválida', amount: 10, kind: 'purchase' },
    { date: '2026-09-20', description: 'sem tipo', amount: 10, kind: 'xyz' },
    { date: '2026-09-21', description: 'parcela sem números', amount: 10, kind: 'installment' },
  ],
};

function deps(over: Partial<ImportAssistDeps> = {}) {
  const logged: number[] = [];
  const prompts: string[] = [];
  const d: ImportAssistDeps = {
    getUserId: async (a) => (a === 'Bearer ok' ? 'u1' : null),
    countRecentCalls: async () => 0,
    logCall: async (_u, usage) => {
      logged.push(usage.input_tokens);
    },
    callModel: async (p) => {
      prompts.push(p.system + p.user);
      return { input: aiOutput, usage: { input_tokens: 1200, output_tokens: 300 } };
    },
    ...over,
  };
  return { d, logged, prompts };
}

const post = (body: unknown, auth = 'Bearer ok') => new Request('http://x', { method: 'POST', headers: { Authorization: auth }, body: JSON.stringify(body) });
const valid = { text: 'Fatura Nubank... 05 SET Dm*Streamingx - Parcela 2/12 R$ 22,90', kind: 'card', categories };

Deno.test('sem token → 401; sem chave da IA → 503', async () => {
  assertEquals((await handleImportAssist(post(valid, 'Bearer x'), deps().d)).status, 401);
  assertEquals((await handleImportAssist(post(valid), deps({ callModel: null }).d)).status, 503);
});

Deno.test('texto vazio, grande demais e limite diário', async () => {
  assertEquals((await handleImportAssist(post({ ...valid, text: 'curto' }), deps().d)).status, 400);
  assertEquals((await handleImportAssist(post({ ...valid, text: 'x'.repeat(60_001) }), deps().d)).status, 413);
  assertEquals((await handleImportAssist(post(valid), deps({ countRecentCalls: async () => DAILY_LIMIT }).d)).status, 429);
});

Deno.test('lê, valida a resposta e registra o uso', async () => {
  const { d, logged, prompts } = deps();
  const res = await handleImportAssist(post(valid), d);
  assertEquals(res.status, 200);
  const { statement } = await res.json();
  assertEquals(statement.issuer, 'Nubank');
  assertEquals(statement.dueDate, '2026-10-13');
  assertEquals(statement.cardLast4s, ['1670']);
  assertEquals(statement.lines.length, 4);
  assertEquals(statement.lines[0], { date: '2026-09-05', description: 'Dm*Streamingx - Parcela 2/12', amount: 22.9, kind: 'installment', installment: { current: 2, total: 12 }, suggestedTitle: 'Streaming X', suggestedCategory: 'Assinaturas' });
  assertEquals(statement.lines[1].suggestedCategory, undefined);
  assertEquals(statement.lines[3].kind, 'purchase');
  assertEquals(logged, [1200]);
  assertStringIncludes(prompts[0]!, 'Comida, Assinaturas, Outros');
});

Deno.test('falha da IA vira 502 e não registra uso', async () => {
  const { d, logged } = deps({
    callModel: async () => {
      throw new Error('boom');
    },
  });
  const res = await handleImportAssist(post(valid), d);
  assertEquals(res.status, 502);
  assertEquals(await res.json(), { error: 'ai_failed', reason: 'unknown' });
  assertEquals(logged, []);
});

Deno.test('motivo da falha da IA', () => {
  assertEquals(failureReason('anthropic 400: {"type":"error","error":{"type":"invalid_request_error","message":"Your credit balance is too low to access the Anthropic API."}}'), 'credit');
  assertEquals(failureReason('anthropic 401: {"error":{"type":"authentication_error","message":"invalid x-api-key"}}'), 'auth');
  assertEquals(failureReason('anthropic 404: {"error":{"type":"not_found_error","message":"model: claude-x"}}'), 'model');
  assertEquals(failureReason('anthropic 429: rate_limit_error'), 'rate_limit');
  assertEquals(failureReason('anthropic 529: overloaded_error'), 'overloaded');
});

Deno.test('prompt e validação sem dados', () => {
  assertStringIncludes(buildPrompt('t', 'account', ['A']).system, 'extratos de conta');
  assertEquals(toStatement(null, 'card', []), { kind: 'card', format: 'pdf', cardLast4s: [], lines: [] });
});
