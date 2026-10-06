# Kash — guia para agentes

Monorepo pnpm + Turborepo. App Expo SDK 57 em `apps/mobile`; regras puras em `packages/domain` (`@kash/domain`). Leia `README.md` para a arquitetura e `docs/plano-integracao-supabase.md` para as fases de integração.

- Use `npx expo install <pkg>` para dependências (resolve versões compatíveis com o SDK).
- No app: rotas em `apps/mobile/app/`; código em `apps/mobile/src/` com alias `@/`. Telas em `src/features/<area>`.
- Cores/tipografia/espaços só via tokens de `src/design-system` — nunca hex solto em telas.
- Regras de negócio em `packages/domain` (puras, Vitest). Telas consomem hooks de `src/store/hooks.ts`; nunca importar design-system ou React no domínio.
- Todo elemento interativo recebe `testID` (kebab-case) e props de acessibilidade.
- Antes de concluir (na raiz): `pnpm typecheck && pnpm lint && pnpm test`. Fluxos E2E em `apps/mobile/e2e/` (Maestro).
- Não edite `ios/` ou `android/` à mão (gerados por prebuild).

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
