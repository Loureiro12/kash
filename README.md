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

## Auth simulada e virada de mês

- Login, cadastro e "esqueci a senha" têm validação, estado carregando e erros. Sem backend, o store simula: senha `errada123` → credencial inválida; e-mail terminando em `@offline.test` → falha de rede; qualquer outra combinação entra (cadastro exige 6+ caracteres).
- Virada de mês (`src/domain/selectors/rollover.ts`, acionada ao abrir o app e ao voltar ao primeiro plano): fecha a fatura de cada cartão com o total do mês anterior, zera "paga" das contas fixas e lança a parcela do mês de cada parcelamento. A fatura fechada aparece na Início e no cartão, com "Pagar fatura" debitando uma conta; o pagamento tem categoria `Fatura` e não entra como gasto no relatório (os gastos já foram contados ao serem lançados no cartão).

## Próxima fase (integrações)

Pontos de encaixe já previstos:
- `src/store/useKashStore.ts` — trocar `seedData` por carga remota e adicionar persistência (ex.: `zustand/middleware persist` + MMKV).
- `signIn`/`signUp`/`requestPasswordReset` no store — trocar a simulação por chamadas reais mantendo `authRequest` como estado de UI.
- Moeda: só Real (R$) nesta fase; outras aparecem como "em breve". Alterar senha valida localmente (a troca real vem com auth).
