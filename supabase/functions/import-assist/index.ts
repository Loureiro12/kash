import { createClient } from 'npm:@supabase/supabase-js@2';
import { handleImportAssist } from './handler.ts';

const url = Deno.env.get('SUPABASE_URL')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
const model = Deno.env.get('IMPORT_AI_MODEL') ?? 'claude-sonnet-5-5';
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
    logCall: async (userId, usage) => {
      await admin.from('ai_calls').insert({ user_id: userId, purpose: 'import', input_tokens: usage.input_tokens, output_tokens: usage.output_tokens });
    },
    callModel: apiKey
      ? async ({ system, user, tool }) => {
          const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
            body: JSON.stringify({
              model,
              max_tokens: 16000,
              system,
              tools: [tool],
              tool_choice: { type: 'tool', name: (tool as { name: string }).name },
              messages: [{ role: 'user', content: user }],
            }),
          });
          if (!res.ok) throw new Error(`anthropic ${res.status}: ${await res.text()}`);
          const data = await res.json();
          const block = (data.content ?? []).find((c: { type: string }) => c.type === 'tool_use');
          return { input: block?.input ?? {}, usage: { input_tokens: data.usage?.input_tokens ?? 0, output_tokens: data.usage?.output_tokens ?? 0 } };
        }
      : null,
  }),
);
