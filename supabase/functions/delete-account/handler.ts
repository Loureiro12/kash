import { corsHeaders } from '../_shared/cors.ts';

/** Dependências injetáveis para testar o handler sem rede. */
export interface DeleteAccountDeps {
  /** devolve o id do usuário dono do token, ou null se inválido */
  getUserId: (authorization: string) => Promise<string | null>;
  /** apaga o usuário no Auth (os dados caem por cascade) */
  deleteUser: (userId: string) => Promise<void>;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

/**
 * POST /delete-account — exclui a conta do usuário autenticado.
 * Exige o próprio token do usuário (não aceita service role de fora).
 */
export async function handleDeleteAccount(req: Request, deps: DeleteAccountDeps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  const authorization = req.headers.get('Authorization') ?? '';
  if (!authorization.startsWith('Bearer ')) return json(401, { error: 'unauthorized' });
  const userId = await deps.getUserId(authorization);
  if (!userId) return json(401, { error: 'unauthorized' });
  await deps.deleteUser(userId);
  return json(200, { ok: true });
}
