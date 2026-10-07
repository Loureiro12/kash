# E2E — Maestro

Fluxos de ponta a ponta rodando no app real (simulador iOS ou emulador Android).

## Pré-requisitos
- Supabase local rodando (`pnpm db:start` na raiz); os fluxos entram com `lara@email.com` / `123456` (seed). `pnpm e2e:ios` usa `e2e/run.sh`, que reseta o banco **antes de cada fluxo** (as escritas do app persistem no Supabase, e cada fluxo assume o seed intacto).
- [Maestro CLI](https://docs.maestro.dev/getting-started/installing-maestro): `curl -Ls "https://get.maestro.mobile.dev" | bash`
- Dev build instalado no simulador: `pnpm ios` (ou `pnpm android`)
- Metro rodando: `pnpm start`

## Rodar
```bash
pnpm e2e:ios                         # todos os fluxos (reset do banco antes de cada um)
MAESTRO_DEVICE=<udid> pnpm e2e:ios   # com simulador e emulador ligados ao mesmo tempo (xcrun simctl list devices | grep Booted)
e2e/run.sh e2e/flows/expense.yaml    # um fluxo, com reset
maestro test e2e/flows/expense.yaml --env APP_ID=com.andreloureiro.kash   # sem reset (estado atual do banco)
```

## Android (emulador)
- Build: `export ANDROID_HOME=$HOME/Library/Android/sdk JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home` e `pnpm --filter mobile exec expo run:android --device Pixel_7`.
- O emulador não enxerga `127.0.0.1` do Mac: `adb reverse tcp:8081 tcp:8081` (Metro) e `adb reverse tcp:54321 tcp:54321` (Supabase) antes de abrir o app; refaça após reiniciar o emulador.
- `launchApp` com `clearState` apaga a URL do dev client; `launch-fresh.yaml` reabre `kash://expo-development-client/?url=…` só no Android.
- Rodar: `maestro --device emulator-5554 test e2e/flows/<fluxo>.yaml --env APP_ID=com.andreloureiro.kash`. Pendência: `inputText` do Maestro é muito lento no emulador com build de debug (chegou a travar); a suíte completa está validada só no iOS.

## E-mails (recuperação de senha)
- O fluxo `reset-password.yaml` lê o e-mail no Mailpit do Supabase local (`http://127.0.0.1:54324/api/v1`) via `runScript` (`scripts/recovery-link.js`) e abre o deep link com `openLink`. O iOS pergunta "Abrir com Kash?"; o fluxo toca em Abrir. Alertas que sobrem de uma execução interrompida são dispensados no `launch-fresh.yaml`.

## Convenções
- Todo elemento interativo tem `testID` em kebab-case (`tab-add`, `chip-cat-Comida`, `bill-bill2`).
- Os fluxos começam limpos via `subflows/launch-fresh.yaml` (`clearState: true`, que também descarta a sessão guardada).
- Valores assertados vêm do seed em `src/store/seed.ts`; se o seed mudar, atualize os fluxos.
- Nomes de mês nas asserções dependem da data atual apenas na Previsão (evitamos assertá-los).
