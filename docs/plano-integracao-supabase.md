# Plano de integração — monorepo + Supabase

Objetivo: tirar o Kash da fase visual (seed em memória) e ligá-lo a um backend 100% Supabase (Postgres + Auth + RLS + RPC + Edge Functions quando necessário), num monorepo com testes de backend de verdade.

## 1. Decisões de arquitetura

| Tema | Decisão | Por quê |
|---|---|---|
| Monorepo | pnpm workspaces + Turborepo | pnpm já é o gerenciador; Turbo dá cache e `turbo run test` por pacote |
| Onde ficam as regras | Postgres (constraints, RLS, views, funções SQL) para tudo que precisa de atomicidade ou consistência; domínio TypeScript (`packages/domain`) para cálculo de exibição (relatório, previsão, ETA de meta) | Regras no banco não dependem do cliente; cálculos de tela continuam rápidos e já testados |
| Leitura | PostgREST (tabelas + views) via `supabase-js` tipado | Zero código de API para CRUD simples |
| Escritas multi-linha | RPC (funções SQL `security invoker`): pagar conta fixa, pagar fatura, lançar parcelado, excluir cartão/conta, virada de mês, desfazer exclusão | Uma transação por operação; testável com pgTAP |
| Edge Functions | Só onde precisa de privilégio ou serviço externo: excluir conta (auth admin), e-mails transacionais | Mantém o backend quase todo em SQL, mais fácil de testar |
| Saldo de conta | `accounts.opening_balance` + view `account_balances` (opening + Σ lançamentos) | Elimina drift; editar "saldo atual" ajusta o opening |
| Exclusão de lançamento | Soft delete (`deleted_at`) com RPC `undo_delete` | Mantém o "Desfazer" sem reconstruir estado no cliente |
| Virada de mês | Função SQL `ensure_rollover(user)` chamada ao abrir o app (RPC) e diariamente por `pg_cron` | Funciona com o app fechado e continua determinística |
| Estado no app | TanStack Query para dados do servidor (cache, loading, erro, optimistic updates); Zustand só para UI (sheets, toast, seleção) | `DataGate` e os estados já criados plugam direto |
| Dinheiro | `numeric(12,2)`; nunca float | Precisão |
| Tipos | `supabase gen types` versionado em `packages/supabase-client`; CI falha se houver drift | Contrato explícito entre banco e app |

## 2. Estrutura do monorepo

```
kash/
  apps/
    mobile/                 # app Expo atual (move da raiz; design-system, features, store, e2e)
  packages/
    domain/                 # tipos + money/dates + selectors + rollover (puro, já testado)
    supabase-client/        # cliente tipado: database.types.ts, repositórios, mappers DB↔domínio, auth helpers
    config/                 # tsconfig/eslint/prettier compartilhados
  supabase/                 # projeto Supabase (CLI)
    config.toml
    migrations/             # schema versionado
    seed.sql                # dados de dev (a conta da Lara)
    functions/              # edge functions (Deno) + _shared/
    tests/                  # pgTAP (*.sql)
  docs/
  turbo.json  pnpm-workspace.yaml  package.json
```

Pontos de atenção na migração do app: Expo 57 detecta monorepo sozinho (Metro resolve a raiz do workspace); `ios/` é regenerado com `prebuild`; os fluxos Maestro passam a rodar de `apps/mobile`.

## 3. Modelo de dados (v1)

Todas as tabelas têm `user_id uuid references auth.users` e RLS `user_id = auth.uid()` para select/insert/update/delete.

- `profiles` (id = auth.users.id): name, phone, theme, hide_values, bill_reminder, monthly_budget, biometrics, currency, last_rollover_month
- `accounts`: name, kind (enum: corrente, poupança, carteira, investimento), institution, opening_balance, color · view `account_balances`
- `cards`: name, last4, limit, closing_day, due_day, gradient
- `transactions`: title, category (enum + 'Entrada' + 'Fatura'), amount (sinal = sentido), date, source_type (account|card), source_id, plan_id, bill_id, invoice_id, deleted_at
- `plans`: title, category, card_id, installments, current, per_installment
- `bills`: name, amount, due_day, category, source_type, source_id, paid_tx_id
- `goals`: name, target, saved, monthly, color, account_id, deposit_day, last_deposit_date
- `invoices`: card_id, month, total, paid_tx_id, paid_at (unique card_id+month)

Funções SQL (RPC): `pay_bill`, `unpay_bill`, `add_installment_purchase`, `pay_invoice`, `record_goal_deposit`, `delete_card`, `delete_account`, `soft_delete_transaction`, `undo_delete`, `ensure_rollover`. Triggers: `set_user_id`, `updated_at`, validação de dia 1..31 e limites.

## 4. Estrutura de testes do backend

1. **pgTAP** em `supabase/tests/*.sql`, rodado por `supabase test db` (Postgres local do CLI):
   - RLS: usuário A não lê nem altera dados de B (um teste por tabela).
   - Constraints e enums (dia inválido, valor negativo onde não pode, unique de fatura).
   - Cada RPC: estado antes/depois (ex.: `pay_bill` cria lançamento com a categoria da conta e marca paga; `unpay_bill` remove; `pay_invoice` debita a conta e não altera gastos do mês; `ensure_rollover` fecha fatura, zera contas fixas e lança parcelas, idempotente no mesmo mês).
   - Views: `account_balances` confere com soma manual.
2. **Integração (Vitest, Node)** em `packages/supabase-client/tests`, contra o Supabase local (`supabase start` + `db reset`): cria usuários via admin API, exercita os repositórios com JWT de usuário real (RLS ativa), valida mappers DB↔domínio e tratamento de erro (sem rede, 401, 409).
3. **Edge Functions**: `deno test` dentro de `supabase/functions` para `delete-account` (mock do admin client).
4. **Contrato**: job de CI roda `supabase gen types` e falha se o arquivo versionado mudar.
5. **App**: testes atuais continuam (domínio e UI com repositório em memória); Maestro roda contra o Supabase local com `pnpm db:reset` antes da suíte.

CI (GitHub Actions): `backend` (ubuntu: CLI do Supabase em Docker, `test db`, Vitest, drift de tipos) · `mobile` (typecheck, lint, jest) · `e2e` (macOS, manual ou noturno, Supabase local + Maestro).

## 5. Fases e critérios de pronto

Status: Fase 0 ✅ · Fase 1 ✅ · Fase 2 ✅ (auth real, sessão criptografada, Edge Function `delete-account`) · Fase 3 ✅ (snapshot via TanStack Query hidratando o store, cache persistida, seed do banco com ids fixos e paridade com o app) · Fase 4 ✅ (escritas otimistas persistidas por repositórios/RPCs com reconciliação pelo snapshot) · Fases 5–6 pendentes.

**Fase 0 — Monorepo** (sem mudar comportamento)
- Mover o app para `apps/mobile`; extrair `packages/domain` e `packages/config`; Turbo com `build/lint/test/typecheck`.
- Pronto quando: app roda no simulador a partir do monorepo, todos os testes atuais passam, CI verde.

**Fase 1 — Backend v1**
- Instalar CLI do Supabase e Deno (brew); `supabase init`; migração v1 com schema, RLS, views, RPCs e `pg_cron`; `seed.sql` com os dados da Lara; pgTAP cobrindo RLS e todas as RPCs; `packages/supabase-client` com tipos gerados, repositórios e Vitest de integração.
- Pronto quando: `supabase test db` e `vitest` verdes localmente e no CI.

**Fase 2 — Auth no app**
- `supabase-js` com sessão em `expo-secure-store`; signup/login/esqueci a senha/sair reais; excluir conta via Edge Function; guards de rota lendo a sessão; biometria com `expo-local-authentication` opcional.
- Pronto quando: fluxos E2E de auth passam contra o Supabase local; a simulação (`errada123`, `@offline.test`) é removida.

**Fase 3 — Leitura**
- TanStack Query com hooks por entidade substituindo o seed; `DataGate` ligado aos estados reais; cache persistido (MMKV) para abrir offline com os últimos dados.
- Pronto quando: todas as telas leem do banco; suíte E2E verde com `db:reset`.

**Fase 4 — Escritas**
- Mutations com optimistic update e rollback; RPCs para operações multi-linha; soft delete + desfazer; validações de formulário iguais às do banco.
- Pronto quando: cada ação das telas tem mutation + teste de integração; E2E verde.

**Fase 5 — Virada de mês e notificações**
- `ensure_rollover` no login/foreground e `pg_cron` diário (fuso America/Sao_Paulo); lembrete de contas e "fatura fechou" com `expo-notifications` (local) a partir dos dados.
- Pronto quando: pgTAP cobre múltiplos meses e idempotência; app reflete a virada sem reinstalar.

**Fase 6 — Preparar release**
- Projeto Supabase de staging + produção com migrações aplicadas pelo CI; `eas build` e `eas update`; checklist de privacidade (exportar/apagar dados).

## 6. Riscos e pontos para confirmar

- Supabase local exige Docker rodando (já instalado); no CI usa-se o container oficial via CLI.
- Modo offline completo (fila de escritas) fica fora deste plano; a Fase 3 entrega só leitura offline do cache.
- Soft delete muda o modelo de "excluir" para todas as entidades ou só lançamentos? Proposta: só lançamentos (único lugar com desfazer).
- Fuso horário do `pg_cron`: um só (BR) ou por usuário?
