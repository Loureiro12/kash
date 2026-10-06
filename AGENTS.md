# Kash — guia para agentes

Expo SDK 57 / React Native 0.86 / Expo Router. Leia `README.md` para a arquitetura.

- Use `npx expo install <pkg>` para dependências (resolve versões compatíveis com o SDK).
- Rotas em `app/`; código em `src/` com alias `@/`. Telas ficam em `src/features/<area>`.
- Cores/tipografia/espaços só via tokens de `src/design-system` — nunca hex solto em telas.
- Regras de negócio em `src/domain` (puras, testadas). Telas consomem hooks de `src/store/hooks.ts`.
- Todo elemento interativo recebe `testID` (kebab-case) e props de acessibilidade.
- Antes de concluir: `pnpm typecheck && pnpm lint && pnpm test`. Fluxos E2E em `e2e/` (Maestro).
- Não edite `ios/` ou `android/` à mão (gerados por prebuild).
