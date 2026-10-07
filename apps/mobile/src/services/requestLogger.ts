/**
 * Log de requisições HTTP do Supabase no terminal do Metro (só em dev, com EXPO_PUBLIC_LOG_REQUESTS=1).
 * Mostra método, caminho, status e duração; corpo de erro quando a resposta não é 2xx.
 * Nunca imprime cabeçalhos (apikey/Authorization) nem corpo de requisições.
 */
export const REQUEST_LOG_ENABLED = __DEV__ && process.env.EXPO_PUBLIC_LOG_REQUESTS === '1';

const MAX_BODY = 400;

function describe(input: RequestInfo | URL): string {
  const raw = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  try {
    const u = new URL(raw);
    return `${u.pathname}${u.search}`;
  } catch {
    return raw;
  }
}

/** Formata uma linha de log; exportada para teste. */
export function formatRequestLog(method: string, path: string, status: number | 'ERR', ms: number): string {
  const mark = status === 'ERR' ? '✖' : status >= 400 ? '⚠' : '→';
  return `[http] ${mark} ${method.toUpperCase()} ${path} ${status} ${Math.round(ms)}ms`;
}

/** `fetch` que registra cada chamada. Injetado no supabase-js via `global.fetch`. */
export function createLoggingFetch(base: typeof fetch = fetch, log: (line: string) => void = console.log): typeof fetch {
  return async (input, init) => {
    const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
    const path = describe(input);
    const started = Date.now();
    try {
      const res = await base(input, init);
      log(formatRequestLog(method, path, res.status, Date.now() - started));
      if (!res.ok) {
        const text = await res.clone().text().catch(() => '');
        if (text) log(`[http]   ${text.slice(0, MAX_BODY)}`);
      }
      return res;
    } catch (err) {
      log(formatRequestLog(method, path, 'ERR', Date.now() - started));
      log(`[http]   ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  };
}
