import { execSync } from 'node:child_process';

/** Lê URL e chaves do `supabase status` se não vierem do ambiente (CI define as variáveis). */
export default function setup() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  let out = '';
  try {
    out = execSync('supabase status -o env', { cwd: `${__dirname}/../../..`, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    throw new Error('Supabase local não está rodando. Rode `supabase start` na raiz do repositório.');
  }
  const env = Object.fromEntries(
    out
      .split('\n')
      .filter((l) => l.includes('='))
      .map((l) => {
        const [k, ...rest] = l.split('=');
        return [k!.trim(), rest.join('=').trim().replace(/^"|"$/g, '')];
      }),
  );
  process.env.SUPABASE_URL = env.API_URL;
  process.env.SUPABASE_ANON_KEY = env.ANON_KEY ?? env.PUBLISHABLE_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = env.SERVICE_ROLE_KEY ?? env.SECRET_KEY;
}
