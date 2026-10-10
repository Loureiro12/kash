# Kash — site e app web (apps/web)

Dois produtos no mesmo projeto **Next.js 16 (App Router)** com **CSS Modules**, mobile first:

- **Site institucional** (landing, política de privacidade, excluir conta): sempre escuro, estático, handoff `design_handoff_kash_site/`.
- **Kash web** (login + o app completo no navegador): mesmas funcionalidades do app mobile, tema claro/escuro, handoff `design_handoff_kash_web/`.

```bash
pnpm dev:web          # http://localhost:3000
pnpm build:web        # build de produção (todas as páginas são estáticas)
pnpm --filter web test        # conteúdo + camada de dados do app (Vitest)
pnpm e2e:web          # Playwright no celular (iPhone 13) e no desktop, com axe
```

Para o app web funcionar (e os testes dele rodarem), o Supabase precisa estar configurado: em dev, `supabase start` na raiz e as variáveis do `.env.example` (o `playwright.config.ts` já lê `supabase status` sozinho).

## Estrutura

```
src/
  app/
    layout.tsx              raiz: fonte Sora (next/font), metadados, skip link
    (marketing)/            site institucional: /, /privacidade e /excluir-conta
    (app)/                  Kash web (noindex): /entrar, /criar-conta, /esqueci-senha e /app/*
    sitemap.ts robots.ts opengraph-image.tsx icon.png apple-icon.png not-found.tsx
  content/                  TEXTO E CONFIGURAÇÃO (sem JSX)
    site.ts                 URL, e-mails, links das lojas, versão web, termos
    landing.ts              hero, pilares, recursos, extras, privacidade, FAQ, CTA
    privacy.ts              as 11 seções da política
  features/account-deletion/ fluxo de excluir conta do site
  features/<área>/          telas do app web (home, cards, accounts, goals, report, forecast, transactions, profile, auth, modals)
  features/app/             casca do app: KashRoot (providers), AppShell (sidebar/menu, atalhos), PageHeader, nav.ts (rotas)
  kash/                     camada de dados do app web (sem JSX de tela)
    client.ts session.tsx   cliente do Supabase com sessão salva no navegador + estado da sessão
    data.tsx                snapshot do usuário (TanStack Query) + virada de mês
    actions.ts              escritas: chamam @kash/supabase-client, avisam com toast e refazem o snapshot
    transactions.ts         regra "lançamento → chamada ao servidor" (parcelado, compra antiga, edição)
    views.ts                projeções das telas a partir do snapshot (seletores de @kash/domain)
    ui.ts theme.ts money.ts estado de interface (modal, toast, menu), tema, máscara de dinheiro
  lib/supabase.ts           cliente do Supabase só em memória (excluir conta pelo site)
  components/
    ui/                     peças reaproveitáveis: Container, Logo, Eyebrow, CheckList, PhoneShot, StoreBadges
    landing/                seções da home
    privacy/                header de documento, índice e seção
    app/                    peças do app web: Modal (foco preso), Confirm, Toast, ui.tsx (botões, campos, chips, switch…), Icon, colors.ts
  styles/tokens.css         tokens do site (sempre escuro)
  styles/app.css            tokens do app web (escuro/claro via data-theme), escopo .kash-app
public/screens/             capturas do app (WebP) usadas como mockups
tests/unit · tests/e2e
```

**Como escalar.** Novas páginas institucionais entram em `(marketing)/` e reaproveitam `DocHeader`, `Toc` e `PolicySectionView`. Telas novas do app entram em `src/app/(app)/app/<rota>/page.tsx` (só metadados + a tela de `features/`), com a rota em `features/app/nav.ts`. Regra de negócio nova vai para `@kash/domain`; leitura/escrita nova para `@kash/supabase-client`; a web só projeta (`kash/views.ts`) e chama (`kash/actions.ts`).

**Decisões**
- Páginas 100% estáticas e componentes de servidor: quase nenhum JavaScript no navegador. O FAQ usa `<details name="faq">` (uma pergunta aberta por vez, sem JS) e o índice da política vira um bloco recolhível no celular.
- CSS do celular para cima: breakpoints em 640, 720 e 900 px; nada de rolagem horizontal (testado).
- Analytics: **Vercel Web Analytics** (`@vercel/analytics`) no layout raiz — conta visitas e páginas do site e do Kash web, sem cookies e sem dados pessoais (as rotas do app não têm ids na URL). Só carrega quando `VERCEL` está definido (no build da Vercel); local e CI ficam sem. Ative em *Vercel › projeto › Analytics › Enable*. A política de privacidade (seção 2) menciona.
- Imagens com `next/image` (AVIF/WebP, `preload` só no hero, `lazy` no resto).
- `site.ts` liga e desliga o que ainda não existe: com `stores.*.available = false`, os botões das lojas mostram "Em breve"; com `webApp = null`, somem os links "Usar no navegador" e os textos que prometem a versão web; com `termsUrl = null`, o link de termos não aparece.

## Kash web (`/entrar` e `/app`)

O app completo no navegador, com a mesma conta, os mesmos dados e as mesmas regras do app mobile.

| Rota | Tela |
|---|---|
| `/entrar` · `/criar-conta` · `/esqueci-senha` | login, cadastro e recuperação por código de e-mail (painel verde do handoff) |
| `/app` | Início: saldo, gastos do mês × limite, mini-previsão, lançamentos, próximas contas (e faturas fechadas), metas |
| `/app/lancamentos` | lista completa por mês, com busca, filtro de tipo e de categoria |
| `/app/cartoes` | cartões, limite, fatura fechada + **pagar fatura**, parcelas em aberto, cobranças recorrentes, lançamentos |
| `/app/contas` · `/app/contas-fixas` | contas bancárias; contas fixas (clique marca como paga, lápis edita) |
| `/app/metas` | anel de progresso, "+ Guardar R$ 50", depósito do mês, dica da semana |
| `/app/relatorio` · `/app/previsao` | 6 meses + por categoria; previsão com seleção de mês (total, divisão, % do limite, acumulado) |
| `/app/perfil/*` | dados pessoais, segurança (alterar senha), limite mensal, categorias, moeda, ajuda, termos, privacidade, exportar dados, sair, excluir conta |

Modais: lançar gasto/entrada (parcelado 1–24x, compra antiga com "1ª parcela em", valor total ou da parcela, data), editar/excluir lançamento (com **Desfazer**), cartão (4 gradientes + cor personalizada), conta, conta fixa, meta, depósito, pagar fatura, categoria (excluir movendo os registros), alterar senha, excluir conta.

**Como funciona.** A sessão do Supabase fica no `localStorage` (`kash-web-auth`); `AppShell` só mostra as telas com sessão e com o snapshot carregado (o mesmo `loadSnapshot` do app, depois do `ensure_rollover`). As escritas vão direto para o servidor (que calcula saldos, parcelas e faturas) e o snapshot é refeito; marcar conta como paga, guardar R$ 50 e as preferências atualizam a tela na hora (otimista). Tema e "ocultar valores" são do perfil, então valem no app e na web.

**Diferenças do app mobile (como no handoff).** Sidebar no lugar da tab bar (abaixo de 900 px vira menu recolhível + botão flutuante "+"), modal com teclado físico no lugar do teclado numérico, sem splash e sem onboarding. Atalhos: **N** abre "Lançar gasto", **Esc** fecha modais e o menu. Face ID/digital só existem no celular. O lembrete de contas da web é **por e-mail** e opt-in (`profiles.email_reminder`; o `bill_reminder` continua sendo o push do celular): todo dia às 9h a Edge Function `send-reminders` envia pelo Resend o que vence em 2 dias (contas fixas e faturas) e os depósitos de metas do dia — configuração em `docs/release.md` › 1.8. "Desafios" do protótipo não existem no app mobile e ficaram de fora.

**Acessibilidade.** `aria-current` no menu, foco preso nos modais e devolvido a quem abriu, `role="switch"`/`radio`/`checkbox` nos controles, links sublinhados no meio do texto, `prefers-reduced-motion`. O Playwright roda o axe em todas as telas, com dados, nos dois temas. Para fechar 4,5:1, o tema claro usa `--accentText #456C00` e `--muted #61666F` (o handoff tem `#4E7A00` e `#6B7079`) e o texto vermelho usa `--negText`.

## Excluir conta (`/excluir-conta`)

Exigência do Google Play: a pessoa pede a exclusão sem precisar do app. Fluxo em dois passos: entrar com e-mail e senha (só para provar que a conta é dela; a sessão fica na memória da aba, sem cookie nem storage) e confirmar com o aceite "é permanente". A exclusão chama a mesma Edge Function `delete-account` do app, que apaga o usuário e todos os dados em cascata. Para quem não consegue entrar, a página oferece o pedido por e-mail ao encarregado. A lógica é uma máquina de estados pura em `features/account-deletion/flow.ts` (Vitest); o Playwright exclui uma conta de verdade quando o Supabase local está de pé.

Variáveis: `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (ver `.env.example`). Sem elas, a página mostra só a alternativa por e-mail.

No Google Play Console (Segurança dos dados › Exclusão de conta), informe `https://<seu domínio>/excluir-conta`.

## Antes de publicar

- [ ] **Revisão jurídica da política.** O texto é o modelo do handoff. Confirme o que ele afirma:
  - "servidores localizados no Brasil": hoje o Supabase de produção está em **ca-central-1 (Canadá)**. Ou recrie o projeto em `sa-east-1` (São Paulo), ou mude o texto da política (seção 7) e do bloco de privacidade da landing (`landing.ts › privacyCallout`).
  - exclusão em até 30 dias, idade mínima de 15 anos, resposta em 15 dias.
- [ ] E-mails `contato@` e `privacidade@kash.app` existem e alguém lê.
- [ ] Domínio definitivo em `NEXT_PUBLIC_SITE_URL` (usado em canonical, sitemap e Open Graph).
- [ ] Quando o app estiver nas lojas, `available: true` em `site.ts`.
- [ ] Página de Termos de uso (depois, `termsUrl`). No app web, `/app/termos` mostra o mesmo modelo do app mobile.
- [ ] Kash web: `site.webApp = '/entrar'` liga os links "Use o Kash no navegador" da landing; volte para `null` se for publicar o site antes do app web.
- [ ] Redirect URLs do Supabase Auth: incluir o domínio do site (cadastro com confirmação de e-mail).

## Deploy

Pensado para a Vercel (projeto com *Root Directory* `apps/web`; o build do monorepo é detectado). Qualquer host que rode `next start` também serve. Variáveis: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (as duas últimas são públicas, as mesmas do app; nunca a service role).
