import Anthropic from 'npm:@anthropic-ai/sdk@1.13.0';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { handleAssistant, PROPOSAL_TOOL, proposalTool, type AssistantPrompt } from './handler.ts';

const url = Deno.env.get('SUPABASE_URL')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
/** modelo do assistente (padrão: Claude Opus 5.5); troque por claude-sonnet-5-5 ou claude-haiku-5-5 para baratear */
const model = Deno.env.get('ASSISTANT_AI_MODEL') ?? 'claude-opus-5-5';
/** low | medium | high — o quanto o modelo pensa antes de responder */
const effort = (Deno.env.get('ASSISTANT_AI_EFFORT') ?? 'medium') as 'low' | 'medium' | 'high';
/** chave de organização (sem workspace) exige o workspace no cabeçalho; chave de workspace dispensa */
const workspaceId = Deno.env.get('ANTHROPIC_WORKSPACE_ID');
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const anthropic = apiKey ? new Anthropic({ apiKey, defaultHeaders: workspaceId ? { 'anthropic-workspace-id': workspaceId } : undefined }) : null;

/** recusa por política: o servidor tenta outro modelo na mesma chamada (só os modelos que aceitam fallbacks) */
const supportsFallbacks = /^claude-(opus-5|sonnet-5-5|fable-5)/.test(model);

async function callModel(prompt: AssistantPrompt) {
  const stream = anthropic!.beta.messages.stream({
    model,
    max_tokens: 16000,
    output_config: { effort },
    ...(supportsFallbacks ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
    // regras fixas e o resumo da pessoa no cache (o resumo muda pouco dentro de uma conversa)
    system: [
      { type: 'text', text: prompt.system, cache_control: { type: 'ephemeral' } },
      { type: 'text', text: `<dados_financeiros>\n${prompt.context}\n</dados_financeiros>`, cache_control: { type: 'ephemeral' } },
    ],
    // lançamento assistido: o modelo só propõe (tool_choice automático; forçar não é aceito nos modelos atuais)
    ...(prompt.ledger ? { tools: [proposalTool(prompt.ledger)] } : {}),
    // a conversa cresce a cada pergunta: o cache automático cobre o histórico
    cache_control: { type: 'ephemeral' },
    // a foto (se houver) vai só na última mensagem da pessoa, antes do texto
    messages: prompt.messages.map((m, i) =>
      prompt.image && i === prompt.messages.length - 1
        ? { role: m.role, content: [{ type: 'image' as const, source: { type: 'base64' as const, media_type: prompt.image.mediaType, data: prompt.image.data } }, { type: 'text' as const, text: m.content }] }
        : { role: m.role, content: m.content },
    ),
  });
  const message = await stream.finalMessage();
  const text = message.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
  // as propostas voltam ao app para confirmação; não há tool_result (a conversa segue como texto)
  const toolInputs = message.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use' && b.name === PROPOSAL_TOOL).map((b) => b.input);
  return { text, toolInputs, stopReason: message.stop_reason, usage: { input_tokens: message.usage.input_tokens, output_tokens: message.usage.output_tokens } };
}

Deno.serve((req) =>
  handleAssistant(req, {
    getUserId: async (authorization) => {
      const client = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
      const { data, error } = await client.auth.getUser();
      return error || !data.user ? null : data.user.id;
    },
    countRecentCalls: async (userId) => {
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { count } = await admin.from('ai_calls').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('purpose', 'assistant').gte('created_at', since);
      return count ?? 0;
    },
    logCall: async (userId, usage) => {
      await admin.from('ai_calls').insert({ user_id: userId, purpose: 'assistant', input_tokens: usage.input_tokens, output_tokens: usage.output_tokens });
    },
    callModel: anthropic ? callModel : null,
  }),
);
