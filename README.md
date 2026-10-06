# Kash — app de finanças pessoais (mobile)

App mobile de finanças pessoais para 15–30 anos com lançamento manual. Esta fase cobre **toda a camada visual** com dados de demonstração; integrações (auth real, persistência, API) vêm na próxima fase.

Stack: **React Native + Expo SDK 57 · TypeScript · Expo Router · Zustand · Reanimated 4 · Jest/RNTL · Maestro**.

## Rodando

```bash
pnpm install
pnpm ios          # build nativo (dev client) + simulador iOS
pnpm android      # idem Android
pnpm start        # Metro (depois do primeiro build)

pnpm typecheck    # tsc --noEmit
pnpm lint         # expo lint
pnpm test         # unitários (Jest + Testing Library)
pnpm e2e:ios      # ponta a ponta (Maestro) — ver e2e/README.md
```

> O app usa módulos nativos (Reanimated, SVG, gradientes), então precisa de **dev build** (`pnpm ios`), não do Expo Go.

## Arquitetura

Camadas com dependência em uma direção só: `app → features → store → domain → design-system`.

```
app/                    Rotas (Expo Router). Arquivos finos: só montam a tela da feature.
  _layout.tsx           Fonts, ThemeProvider, guards de auth (Stack.Protected), ToastHost
  (auth)/               onboarding, login
  (app)/_layout.tsx     Stack logado + FloatingTabBar + SheetsHost
  (app)/(tabs)/         index (Início), cards, accounts, goals
  (app)/report|forecast|profile|terms|privacy   páginas internas (push)

src/design-system/      Design system — nada aqui conhece o domínio
  tokens/               cores (dark/light), tipografia Sora, spacing, radii, shadows, motion
  theme/                ThemeProvider + useTheme (o modo vem de fora)
  components/           26 primitivos: Text, Button, Card, Chip, Input, Switch, ProgressBar,
                        ProgressRing, BottomSheet, Toast, Keypad, SegmentedControl, ListRow…
  icons/                wrapper do Lucide (stroke 2.2)

src/domain/             Regras de negócio puras (sem React)
  types.ts              Account, Card, Tx, Bill, Goal, Plan, Settings
  money.ts dates.ts     formatação BRL determinística, datas relativas, nomes de mês
  selectors/            orçamento, fatura/parcelas, contas fixas, metas, relatório, previsão

src/store/              Zustand: estado + ações; seed mock; hooks derivados (useHomeSummary…)
src/features/           Uma pasta por área: telas e sheets que compõem DS + store
src/lib/                clock injetável (testes), ids
e2e/                    Fluxos Maestro
```

Decisões:
- **Tab bar flutuante fora dos navegadores** (`(app)/_layout`): continua visível em páginas internas sem aba ativa, como no protótipo, e as páginas internas usam push/swipe-back nativo.
- **Sheets globais** montados uma vez (`SheetsHost`) e controlados pelo store (`ui.sheet`). Cada formulário é remontado por `key = ui.sheetNonce`, então abre sempre limpo sem efeitos de reset.
- **CTA fixo no rodapé dos sheets** (`BottomSheet footer`): o botão principal fica sempre visível, mesmo com o teclado aberto ou o conteúdo rolando; o sheet encolhe para o espaço restante abaixo da status bar.
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

## Testes

- **Unitários** (`src/**/__tests__`): seletores de domínio, store (fluxos de auth, lançar gasto, parcelas, metas), componentes do DS e o sheet de gasto.
- **E2E** (`e2e/flows`): onboarding → login, Início, lançar gasto (à vista e parcelado), cartões, contas (bancárias/fixas), metas, páginas internas, perfil/exclusão de conta. Rodam no app real via Maestro.

Convenção de `testID`: kebab-case por área: `tab-add`, `chip-cat-Comida`, `bill-bill2`, `sheet-expense-close`, `report-back`.

## Próxima fase (integrações)

Pontos de encaixe já previstos:
- `src/store/useKashStore.ts` — trocar `seedData` por carga remota e adicionar persistência (ex.: `zustand/middleware persist` + MMKV).
- `LoginScreen` — ligar `login()` a auth real.
- "Nova conta fixa", "Nova meta", "Editar perfil" hoje mostram toast "Em breve".
