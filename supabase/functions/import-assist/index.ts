import Anthropic from 'npm:@anthropic-ai/sdk@1.13.0';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { handleImportAssist, jsonFromText } from './handler.ts';

const url = Deno.env.get('SUPABASE_URL')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
const model = Deno.env.get('IMPORT_AI_MODEL') ?? 'claude-sonnet-5-5';
/** nomes e categorias de OFX/CSV: tarefa curta, modelo menor e mais barato */
const namesModel = Deno.env.get('IMPORT_AI_NAMES_MODEL') ?? 'claude-haiku-5-5';
/** chave de organização (sem workspace) exige o workspace no cabeçalho; chave de workspace dispensa */
const workspaceId = Deno.env.get('ANTHROPIC_WORKSPACE_ID');
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
// até ~400 linhas numa fatura: 3 min de folga (o SDK já refaz 429/529 sozinho)
const anthropic = apiKey ? new Anthropic({ apiKey, timeout: 180_000, maxRetries: 1, defaultHeaders: workspaceId ? { 'anthropic-workspace-id': workspaceId } : undefined }) : null;

Deno.serve((req) =>
  handleImportAssist(req, {
    getUserId: async (authorization) => {
      const client = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
      const { data, error } = await client.auth.getUser();
      return error || !data.user ? null : data.user.id;
    },
    // o assistente tem o próprio limite (ver functions/assistant)
    countRecentCalls: async (userId) => {
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { count } = await admin.from('ai_calls').select('id', { count: 'exact', head: true }).eq('user_id', userId).neq('purpose', 'assistant').gte('created_at', since);
      return count ?? 0;
    },
    logCall: async (userId, usage, purpose) => {
      await admin.from('ai_calls').insert({ user_id: userId, purpose, input_tokens: usage.input_tokens, output_tokens: usage.output_tokens });
    },
    callModel: anthropic
      ? async ({ system, user, tool, purpose }) => {
          let message: Anthropic.Message;
          try {
            // streaming: uma fatura grande (100+ linhas) passa de 10 mil tokens e levaria a requisição ao limite de tempo
            const stream = anthropic.messages.stream({
              model: purpose === 'names' ? namesModel : model,
              // Fatura: ~70 tokens por linha; 32 mil cobrem ~400 linhas. Nomes: ~30 tokens por item
              max_tokens: purpose === 'names' ? 8000 : 32000,
              // copiar linhas não pede raciocínio: esforço baixo deixa a resposta para as linhas (e mais rápida)
              output_config: { effort: 'low' },
              system,
              tools: [tool as Anthropic.Tool],
              // modelos atuais não aceitam forçar a ferramenta (tool/any): o prompt manda usar e o texto é plano B
              tool_choice: { type: 'auto' },
              messages: [{ role: 'user', content: user }],
            });
            message = await stream.finalMessage();
          } catch (err) {
            // mantém o formato "anthropic <status>: …" que failureReason/failureDetail entendem
            if (err instanceof Anthropic.APIError) throw new Error(`anthropic ${err.status ?? 0}: ${JSON.stringify(err.error ?? err.message)}`);
            throw err;
          }
          const usage = { input_tokens: message.usage.input_tokens, output_tokens: message.usage.output_tokens };
          const stopReason = message.stop_reason;
          const block = message.content.find((c): c is Anthropic.ToolUseBlock => c.type === 'tool_use');
          if (block) return { input: block.input ?? {}, usage, stopReason };
          // sem a ferramenta: aproveita um JSON no texto, se houver
          const text = message.content.filter((c): c is Anthropic.TextBlock => c.type === 'text').map((c) => c.text).join('\n');
          const parsed = jsonFromText(text, purpose === 'names' ? 'suggestions' : 'lines');
          if (parsed) return { input: parsed, usage, stopReason };
          throw new Error(`anthropic 200: resposta sem tool_use (stop_reason ${stopReason})`);
        }
      : null,
  }),
);
