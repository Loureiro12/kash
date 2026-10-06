# @kash/supabase-client

Cliente tipado do backend (Supabase): tipos gerados do banco, repositórios por entidade, mappers para `@kash/domain` e helpers de auth com erros normalizados (`KashApiError`).

```bash
supabase start                              # stack local (Docker)
pnpm --filter @kash/supabase-client test    # Vitest de integração contra o banco local
pnpm --filter @kash/supabase-client gen:types
```

Os testes criam usuários reais via admin API e exercitam RLS, RPCs e mappers.
