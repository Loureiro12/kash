import { execSync } from 'node:child_process';
import { defineConfig, devices } from '@playwright/test';

/**
 * Com o Supabase local de pé, o site é construído apontando para ele (fluxo de excluir conta testado
 * de verdade). Sem ele (ex.: CI do site), as variáveis ficam vazias e o site mostra a alternativa por e-mail.
 */
function localSupabase(): Record<string, string> {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) return {};
  try {
    const out = execSync('supabase status -o env', { cwd: '../..', stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    const env = Object.fromEntries(out.split('\n').map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/)).filter((m): m is RegExpMatchArray => !!m).map((m) => [m[1]!, m[2]!]));
    if (!env.API_URL || !env.ANON_KEY) return {};
    return { NEXT_PUBLIC_SUPABASE_URL: env.API_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY: env.ANON_KEY, SUPABASE_SERVICE_ROLE_KEY: env.SERVICE_ROLE_KEY ?? '' };
  } catch {
    return {};
  }
}
const supabaseEnv = localSupabase();
Object.assign(process.env, supabaseEnv);

const PORT = Number(process.env.PORT ?? 3100);

/** E2E contra o build de produção, no celular (primeiro) e no desktop. */
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure' },
  projects: [
    { name: 'mobile', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 860 } } },
  ],
  webServer: {
    command: `pnpm build && pnpm exec next start --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: { NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '' },
  },
});
