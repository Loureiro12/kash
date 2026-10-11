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

Deno.serve((req) =>
  handleImportAssist(req, {
    getUserId: async (authorization) => {
      const client = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
      const { data, error } = await client.auth.getUser();
      return error || !data.user ? null : data.user.id;
    },
    countRecentCalls: async (userId) => {
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { count } = await admin.from('ai_calls').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', since);
      return count ?? 0;
    },
    logCall: async (userId, usage, purpose) => {
      await admin.from('ai_calls').insert({ user_id: userId, purpose, input_tokens: usage.input_tokens, output_tokens: usage.output_tokens });
    },
    callModel: apiKey
      ? async ({ system, user, tool, purpose }) => {
          const body = JSON.stringify({
            model: purpose === 'names' ? namesModel : model,
            // uma fatura tem dezenas de linhas (~3 mil tokens de saída); 8 mil dá folga. Nomes: ~30 tokens por item
            max_tokens: purpose === 'names' ? 6000 : 8000,
            system,
            tools: [tool],
            // modelos atuais não aceitam forçar a ferramenta (tool/any): o prompt manda usar e o texto é plano B
            tool_choice: { type: 'auto' },
            messages: [{ role: 'user', content: user }],
          });
          // uma nova tentativa quando a API está sobrecarregada ou limitando (429/529)
          for (let attempt = 1; ; attempt++) {
            const res = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json', ...(workspaceId ? { 'anthropic-workspace-id': workspaceId } : {}) },
              body,
              signal: AbortSignal.timeout(120_000),
            });
            if ((res.status === 429 || res.status === 529) && attempt === 1) {
              await new Promise((r) => setTimeout(r, 2000));
              continue;
            }
            if (!res.ok) throw new Error(`anthropic ${res.status}: ${await res.text()}`);
            const data = await res.json();
            const usage = { input_tokens: data.usage?.input_tokens ?? 0, output_tokens: data.usage?.output_tokens ?? 0 };
            const block = (data.content ?? []).find((c: { type: string }) => c.type === 'tool_use');
            if (block) return { input: block.input ?? {}, usage };
            // sem a ferramenta: aproveita um JSON no texto, se houver
            const text = (data.content ?? []).filter((c: { type: string }) => c.type === 'text').map((c: { text: string }) => c.text).join('\n');
            const parsed = jsonFromText(text, purpose === 'names' ? 'suggestions' : 'lines');
            if (parsed) return { input: parsed, usage };
            throw new Error(`anthropic ${res.status}: resposta sem tool_use (stop_reason ${data.stop_reason})`);
          }
        }
      : null,
  }),
);
