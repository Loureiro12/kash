# E2E — Maestro

Fluxos de ponta a ponta rodando no app real (simulador iOS ou emulador Android).

## Pré-requisitos
- [Maestro CLI](https://docs.maestro.dev/getting-started/installing-maestro): `curl -Ls "https://get.maestro.mobile.dev" | bash`
- Dev build instalado no simulador: `pnpm ios` (ou `pnpm android`)
- Metro rodando: `pnpm start`

## Rodar
```bash
pnpm e2e:ios          # todos os fluxos, app id com.kash.app
maestro test e2e/flows/expense.yaml --env APP_ID=com.kash.app   # um fluxo
maestro test e2e/flows --env APP_ID=com.kash.app --include-tags smoke
```

## Convenções
- Todo elemento interativo tem `testID` em kebab-case (`tab-add`, `chip-cat-Comida`, `bill-bill2`).
- Os fluxos começam limpos via `subflows/launch-fresh.yaml` (`clearState: true`).
- Valores assertados vêm do seed em `src/store/seed.ts`; se o seed mudar, atualize os fluxos.
- Nomes de mês nas asserções dependem da data atual apenas na Previsão (evitamos assertá-los).
