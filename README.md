# Kash — app de finanças pessoais (mobile)

App mobile de finanças pessoais para 15–30 anos com lançamento manual. Esta fase cobre **toda a camada visual** com dados de demonstração; integrações (auth real, persistência, API) vêm na próxima fase.

Stack: **React Native + Expo SDK 57 · TypeScript · Expo Router · Zustand · Reanimated 4 · Jest/RNTL · Maestro**.

## Monorepo

```
apps/mobile/          app Expo (design system, telas, store, e2e Maestro)
packages/domain/      @kash/domain — regras puras (tipos, dinheiro, datas, seletores, virada de mês) + seed de dev
packages/config/      tsconfig base compartilhado
supabase/             (Fase 1) migrações, seed, funções e testes do backend
docs/                 plano de integração
```

pnpm workspaces + Turborepo. Comandos na raiz:

```bash
pnpm install
pnpm ios          # build nativo (dev client) + simulador iOS
pnpm dev          # Metro do app (depois do primeiro build)

pnpm typecheck    # todos os pacotes (turbo)
pnpm lint
pnpm test         # Jest no app + Vitest no domínio
pnpm e2e:ios      # ponta a ponta (Maestro) — ver apps/mobile/e2e/README.md
```

Dentro de `apps/mobile` os scripts `start`, `ios`, `test`, `lint`, `typecheck` continuam funcionando.

> O app usa módulos nativos (Reanimated, SVG, gradientes), então precisa de **dev build** (`pnpm ios`), não do Expo Go.

## Arquitetura

Camadas com dependência em uma direção só: `app → features → store → design-system → @kash/domain`. O design system importa do domínio apenas as cores de categoria.

Caminhos abaixo são relativos a `apps/mobile`, exceto `packages/domain`.

```
app/                    Rotas (Expo Router). Arquivos finos: só montam a tela da feature.
  _layout.tsx           Fonts, ThemeProvider, guards de auth (Stack.Protected), ToastHost
  (auth)/               onboarding, login
  (app)/_layout.tsx     Stack logado + FloatingTabBar + SheetsHost
  (app)/(tabs)/         index (Início), cards, accounts, goals
  (app)/report|forecast|transactions|terms|privacy   páginas internas (push)
  (app)/profile/                                 index, personal, security, budget, currency, help

src/design-system/      Design system — nada aqui conhece o domínio
  tokens/               cores (dark/light), tipografia Sora, spacing, radii, shadows, motion
  theme/                ThemeProvider + useTheme (o modo vem de fora)
  components/           26 primitivos: Text, Button, Card, Chip, Input, Switch, ProgressBar,
                        ProgressRing, BottomSheet, Toast, Keypad, SegmentedControl, ListRow…
  icons/                wrapper do Lucide (stroke 2.2)

packages/domain/src/    @kash/domain — regras de negócio puras (sem React), testadas com Vitest
  types.ts              Account, Card, Tx, Bill, Goal, Plan, Invoice, Settings
  categories.ts         cores de categoria e ids de gradiente (compartilhados com o backend)
  money.ts dates.ts     formatação BRL determinística, datas relativas, nomes de mês
  selectors/            orçamento, fatura/parcelas, contas fixas, metas, relatório, previsão, rollover
  fixtures/seed.ts      dados de demonstração

src/store/              Zustand: estado + ações; seed mock; hooks derivados (useHomeSummary…)
src/features/           Uma pasta por área: telas e sheets que compõem DS + store
src/lib/                clock injetável (testes), ids
e2e/                    Fluxos Maestro
```

Decisões:
- **Tab bar flutuante fora dos navegadores** (`(app)/_layout`): continua visível em páginas internas sem aba ativa, como no protótipo, e as páginas internas usam push/swipe-back nativo.
- **Sheets globais** montados uma vez (`SheetsHost`) e controlados pelo store (`ui.sheet`). Cada formulário é remontado por `key = ui.sheetNonce`, então abre sempre limpo sem efeitos de reset.
- **CTA fixo no rodapé dos sheets** (`BottomSheet footer`): o botão principal fica sempre visível, mesmo com o teclado aberto ou o conteúdo rolando; o sheet encolhe para o espaço restante abaixo da status bar.
- **Editar e excluir tudo**: cartões (botão "Editar" no limite), contas (toque na linha), contas fixas e metas (toque longo) reabrem o sheet de cadastro em modo edição, com exclusão confirmada e regras de cascata (cartão/conta apagam seus lançamentos; conta fixa e meta não mexem em lançamentos).
- **Estados vazio, carregando e erro**: `EmptyState`, `ScreenSkeleton` e `ErrorState` no design system; `DataGate` lê `ui.dataStatus` (sempre "ready" nesta fase) para a integração plugar carregamento e retry sem tocar nas telas.
- **Lançamentos completos**: o sheet registra gasto ou entrada, com data (sem datas futuras); tocar numa linha abre para editar ou excluir (com desfazer no toast, e escolha entre uma parcela ou o plano inteiro). A tela "Lançamentos" lista por mês com filtros de tipo e categoria.
- **Contas fixas cobradas em cartão ou conta** (`bill.sourceId`): marcar como paga gera o lançamento (entra na fatura do cartão ou debita a conta); desmarcar remove. O cartão lista suas cobranças recorrentes.
- **Metas com depósito mensal**: cada meta pode ter conta onde o dinheiro fica guardado e dia do depósito. Quando o dia chega sem registro no mês, o card entra em "pendente" e o botão vira "Depositar" (sheet com valor sugerido = aporte mensal). O depósito é um registro na meta, não movimenta o saldo da conta.
- **Regras de cálculo no domínio**, nunca nas telas; hooks em `src/store/hooks.ts` fazem a ponte. Trocar o seed por API depois não toca em componentes.
- **Dinheiro** formatado por função própria (`formatBRL`) para evitar diferenças de `Intl` entre plataformas; agregados arredondados a 2 casas.
- **Relógio injetável** (`src/lib/clock.ts`) para congelar "hoje" em testes.

## Design system

Tokens vêm do handoff (`design_handoff_kash/README.md`) e são a única fonte de cor/tipo/espaço:

- Temas escuro (padrão) e claro — `settings.theme` → `ThemeProvider`.
- `Text` só aceita `variant` da escala tipográfica (`display`, `screenTitle`, `balance`, `section`, `body`, `meta`, `chip`…).
- Componentes recebem `testID` e semântica de acessibilidade (`accessibilityRole/State/Label`); alvos ≥ 44px.
- Animações: sheets 300ms `cubic-bezier(.2,.8,.2,1)`, barras/anéis 400ms, switch 200ms, cartão selecionado scale .96→1.
- Haptics leves em toques de ação (`Pressable haptic`).

## Ícone e splash

Assets em `assets/brand/` (ver `assets/brand/README.md`). O `app.json` aponta:
- iOS: ícone claro/escuro (`ios.icon.light/dark`), Android: adaptive icon (foreground + fundo `#C6F432` + monocromático gerado).
- Splash nativa (`expo-splash-screen`): logo isolado centralizado sobre `#C6F432`.
- Splash animada em código (`src/features/splash/AnimatedSplash.tsx`): segue a spec do handoff (ícone com overshoot, ponto, wordmark, tagline, barra, saída com fade/scale, ~2,8 s) e pode ser pulada com um toque.

Mudou ícone ou splash? Regere o projeto nativo: `npx expo prebuild --clean` e depois `pnpm ios`.

## Testes

- **Unitários** (`src/**/__tests__`): seletores de domínio, store (fluxos de auth, lançar gasto, parcelas, metas), componentes do DS e o sheet de gasto.
- **E2E** (`e2e/flows`): onboarding → login, Início, lançar gasto (à vista e parcelado), cartões, contas (bancárias/fixas), metas, páginas internas, perfil/exclusão de conta. Rodam no app real via Maestro.

Convenção de `testID`: kebab-case por área: `tab-add`, `chip-cat-Comida`, `bill-bill2`, `sheet-expense-close`, `report-back`.

## Backend (Supabase)

Schema, RLS, views e RPCs em `supabase/migrations`; seed local com a usuária Lara (`lara@email.com` / `123456`) e helpers de teste em `supabase/seed.sql`; testes pgTAP em `supabase/tests`. O pacote `@kash/supabase-client` expõe o cliente tipado, repositórios e mappers para o domínio, com testes de integração (Vitest) contra o banco local.

```bash
pnpm db:start        # sobe o stack local (Docker)
pnpm db:reset        # reaplica migrações + seed
pnpm db:test         # pgTAP
pnpm test:backend    # pgTAP + integração
pnpm db:types        # regenera packages/supabase-client/src/database.types.ts (o CI falha se houver drift)
(cd supabase/functions && deno test)   # Edge Functions
```

O app lê `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY` de `apps/mobile/.env` (ver `.env.example`; valores do `supabase status -o env`).

Decisões (ver `docs/plano-integracao-supabase.md`): saldo de conta é uma view (abertura + lançamentos), escritas multi-linha são RPCs (`pay_bill`, `pay_invoice`, `add_installment_purchase`, `soft_delete_transaction`/`undo_delete_transaction`, `delete_card`, `delete_account`, `ensure_rollover`), e a virada de mês roda por RPC ao abrir o app e por `pg_cron` diariamente.

## Dados do servidor (TanStack Query)

`apps/mobile/src/data/`: uma query carrega o snapshot do usuário (`loadSnapshot` do `@kash/supabase-client`, leituras em paralelo) e hidrata o Zustand, que continua sendo a cache normalizada consumida pelas telas; a cache da query é persistida no AsyncStorage, então o app abre com os últimos dados mesmo sem rede e refaz a leitura ao voltar ao primeiro plano. `DataGate` lê `ui.dataStatus` (esqueleto enquanto não há dados, erro com "tentar de novo" que refaz a query). `EXPO_PUBLIC_DATA_SOURCE=seed` mantém os dados de demonstração em memória (útil sem backend).

Escritas (`apps/mobile/src/data/remoteActions.ts`): cada ação do store continua aplicando a mudança localmente (otimista) e ganha um "depois" que chama o repositório ou a RPC correspondente via `persist`; dando certo ou não, o snapshot é refeito, então o servidor é a verdade (ids reais substituem os temporários, erro vira toast e o estado volta ao do servidor). Excluir lançamento usa soft delete no servidor e "Desfazer" chama a RPC de undo. A virada de mês no modo remoto é a RPC `ensure_rollover`.

## Auth e virada de mês

- Login, cadastro e "esqueci a senha" usam o Supabase Auth via `@kash/supabase-client`; a sessão fica criptografada no aparelho (chave AES no SecureStore, payload no AsyncStorage) e o app abre direto na Início quando há sessão. Excluir conta chama a Edge Function `delete-account`. No local, a usuária do seed é `lara@email.com` / `123456`.
- Alterar senha (Perfil › Segurança) re-autentica com a senha atual e grava a nova (`changePassword` no client; erros: senha atual incorreta, nova igual à atual).
- Recuperar senha: o e-mail (template em `supabase/templates/recovery.html`) traz o deep link `kash://reset-password?token_hash=…`; o app (`src/features/auth/useAuthLinks.ts`) troca o token por sessão (`recoverSessionFromUrl`), entra no estado `recovery`, em que só a tela de nova senha existe, e ao salvar cai na Início. Links expirados viram toast. Em produção, prefira um universal link (https) que redirecione para o esquema, porque alguns clientes de e-mail não tornam `kash://` clicável — fica para a Fase 6.
- Virada de mês (`src/domain/selectors/rollover.ts`, acionada ao abrir o app e ao voltar ao primeiro plano): fecha a fatura de cada cartão com o total do mês anterior, zera "paga" das contas fixas e lança a parcela do mês de cada parcelamento. A fatura fechada aparece na Início e no cartão, com "Pagar fatura" debitando uma conta; o pagamento tem categoria `Fatura` e não entra como gasto no relatório (os gastos já foram contados ao serem lançados no cartão).

## Exportar dados (privacidade)

- Perfil › "Exportar meus dados" chama a RPC `export_my_data` (SQL puro sob RLS; devolve perfil, configurações e todas as coleções, inclusive lançamentos excluídos com `deleted_at`, num JSON versionado `kash-export/1`), grava `kash-export-<data>.json` no cache (`expo-file-system`) e abre a folha de compartilhamento (`expo-sharing`). No modo `seed` o JSON vem do store. Hook em `src/features/profile/useExportData.ts`; testes em pgTAP (`006_export.sql`), Vitest (`tests/export.test.ts`) e Jest.

## Lembretes (notificações locais)

- `planReminders` (`@kash/domain`) é pura: a partir de contas fixas, faturas em aberto, metas e `settings.billReminder` devolve a lista de lembretes (2 dias antes do vencimento de contas e faturas às 9h, dia do depósito das metas, aviso "faturas fecharam" no dia 1º). Testada em `packages/domain/src/__tests__/reminders.test.ts`.
- `src/services/notifications.ts` embrulha o `expo-notifications` (permissão, canal Android, agendar/cancelar serializado). `src/features/notifications/useReminders.ts`: `useReminderSync` reagenda sempre que o plano muda ou o app volta ao primeiro plano; `useNotificationRouting` abre a rota guardada na notificação; `useToggleBillReminder` pede a permissão ao ligar o switch (negada → toast com atalho pros Ajustes).
- Em dev o Metro loga `[kash] lembretes agendados: N`. No Jest o módulo é mockado em `src/test/setup.ts`.

## Próxima fase (integrações)

Pontos de encaixe já previstos:
- Fase 6: produção. Ver `docs/release.md` (Supabase de produção via `pnpm deploy:backend` (migrações, Edge Function e `scripts/config-push.sh`, que omite templates de e-mail até existir SMTP próprio) e workflow `deploy-backend.yml`; app via EAS Build/Update, perfis em `apps/mobile/eas.json`, workflow manual `release-app.yml`). `expo-updates` com `runtimeVersion` = versão do app.
- Moeda: só Real (R$) nesta fase; outras aparecem como "em breve".
