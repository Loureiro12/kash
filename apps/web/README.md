# Kash — site (apps/web)

Landing page e política de privacidade do Kash, em **Next.js 16 (App Router)** com **CSS Modules**. Mobile first, sempre escuro, conteúdo e design do handoff `design_handoff_kash_site/`.

```bash
pnpm dev:web          # http://localhost:3000
pnpm build:web        # build de produção (todas as páginas são estáticas)
pnpm --filter web test        # conteúdo (Vitest)
pnpm e2e:web          # Playwright no celular (iPhone 13) e no desktop, com axe
```

## Estrutura

```
src/
  app/
    layout.tsx              raiz: fonte Sora (next/font), metadados, skip link
    (marketing)/            site institucional: / e /privacidade
    sitemap.ts robots.ts opengraph-image.tsx icon.png apple-icon.png not-found.tsx
  content/                  TEXTO E CONFIGURAÇÃO (sem JSX)
    site.ts                 URL, e-mails, links das lojas, versão web, termos
    landing.ts              hero, pilares, recursos, extras, privacidade, FAQ, CTA
    privacy.ts              as 11 seções da política
  components/
    ui/                     peças reaproveitáveis: Container, Logo, Eyebrow, CheckList, PhoneShot, StoreBadges
    landing/                seções da home
    privacy/                header de documento, índice e seção
  styles/tokens.css         tokens do handoff (cores, tipografia, espaços, raios, movimento)
public/screens/             capturas do app (WebP) usadas como mockups
tests/unit · tests/e2e
```

**Como escalar.** O Kash web (o app completo no navegador) entra como outro grupo de rotas em `src/app`, por exemplo `(app)/`, reaproveitando o layout raiz, os tokens e os pacotes `@kash/domain` e `@kash/supabase-client`, que não dependem do React Native. Novas páginas institucionais (termos, ajuda) entram em `(marketing)/` e reaproveitam `DocHeader`, `Toc` e `PolicySectionView`.

**Decisões**
- Páginas 100% estáticas e componentes de servidor: quase nenhum JavaScript no navegador. O FAQ usa `<details name="faq">` (uma pergunta aberta por vez, sem JS) e o índice da política vira um bloco recolhível no celular.
- CSS do celular para cima: breakpoints em 640, 720 e 900 px; nada de rolagem horizontal (testado).
- Imagens com `next/image` (AVIF/WebP, `preload` só no hero, `lazy` no resto).
- `site.ts` liga e desliga o que ainda não existe: com `stores.*.available = false`, os botões das lojas mostram "Em breve"; com `webApp = null`, somem os links "Usar no navegador" e os textos que prometem a versão web; com `termsUrl = null`, o link de termos não aparece.

## Antes de publicar

- [ ] **Revisão jurídica da política.** O texto é o modelo do handoff. Confirme o que ele afirma:
  - "servidores localizados no Brasil": hoje o Supabase de produção está em **ca-central-1 (Canadá)**. Ou recrie o projeto em `sa-east-1` (São Paulo), ou mude o texto da política (seção 7) e do bloco de privacidade da landing (`landing.ts › privacyCallout`).
  - "disponível para iPhone, Android e navegador" e "sincronizar entre celular e navegador": a versão web ainda não existe.
  - exclusão em até 30 dias, idade mínima de 15 anos, resposta em 15 dias.
- [ ] E-mails `contato@` e `privacidade@kash.app` existem e alguém lê.
- [ ] Domínio definitivo em `NEXT_PUBLIC_SITE_URL` (usado em canonical, sitemap e Open Graph).
- [ ] Quando o app estiver nas lojas, `available: true` em `site.ts`.
- [ ] Página de Termos de uso (depois, `termsUrl`).

## Deploy

Pensado para a Vercel (projeto com *Root Directory* `apps/web`; o build do monorepo é detectado). Qualquer host que rode `next start` também serve. Variável: `NEXT_PUBLIC_SITE_URL`.
