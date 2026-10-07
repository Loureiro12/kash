import { createLoggingFetch, formatRequestLog } from '@/services/requestLogger';

describe('log de requisições', () => {
  it('formata método, caminho, status e duração', () => {
    expect(formatRequestLog('post', '/auth/v1/token?grant_type=password', 200, 312.4)).toBe('[http] → POST /auth/v1/token?grant_type=password 200 312ms');
    expect(formatRequestLog('GET', '/rest/v1/accounts', 401, 20)).toMatch(/⚠ GET/);
    expect(formatRequestLog('GET', '/x', 'ERR', 5)).toMatch(/✖ GET \/x ERR 5ms/);
  });

  it('registra sucesso, corpo de erro e falha de rede, sem alterar a resposta', async () => {
    const lines: string[] = [];
    const base = jest
      .fn<Promise<Response>, [RequestInfo | URL, RequestInit | undefined]>()
      .mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }))
      .mockResolvedValueOnce(new Response('{"message":"Invalid login credentials"}', { status: 400 }))
      .mockRejectedValueOnce(new TypeError('Network request failed'));
    const f = createLoggingFetch(base as unknown as typeof fetch, (l) => lines.push(l));

    const ok = await f('https://x.supabase.co/rest/v1/accounts?select=*', { method: 'GET' });
    expect(await ok.json()).toEqual({ ok: true });
    await f('https://x.supabase.co/auth/v1/token?grant_type=password', { method: 'POST' });
    await expect(f('https://x.supabase.co/rest/v1/bills')).rejects.toThrow('Network request failed');

    expect(lines).toEqual([
      expect.stringMatching(/^\[http\] → GET \/rest\/v1\/accounts\?select=\* 200 \d+ms$/),
      expect.stringMatching(/^\[http\] ⚠ POST \/auth\/v1\/token\?grant_type=password 400 \d+ms$/),
      '[http]   {"message":"Invalid login credentials"}',
      expect.stringMatching(/^\[http\] ✖ GET \/rest\/v1\/bills ERR \d+ms$/),
      '[http]   Network request failed',
    ]);
  });
});
