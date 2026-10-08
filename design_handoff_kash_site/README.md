# Handoff: Kash — site (Landing + Política de privacidade)

## Sobre os arquivos
`Kash Landing.dc.html` e `Kash Privacidade.dc.html` são **protótipos de referência em HTML**. Não são código de produção. Recrie as páginas na stack do site (sugestão: Next.js/Astro + Tailwind ou CSS Modules) seguindo os padrões do projeto. Para ver as páginas, abra os arquivos no navegador; os dados (recursos, FAQ, seções da política) estão no bloco `<script data-dc-script>` de cada arquivo.

`Kash.dc.html`, `ios-frame.jsx` e `support.js` só existem para renderizar os mockups do app dentro da landing. **Não precisam ser portados.** Em produção, troque os mockups por **imagens estáticas** (PNG/WebP), exportadas das screenshots de loja em `export/store/` ou capturadas do app real.

## Fidelidade
**Alta (hi-fi).** Cores, tipografia, espaçamento e textos são finais. O site é **sempre escuro**; não existe tema claro.

---

## Tokens
| Token | Valor | Uso |
|---|---|---|
| bg | `#0B0C0E` | fundo da página |
| surface | `#16181C` | cards (privacidade, resumo) |
| surface2 | `#1F2227` | itens dentro de cards |
| text | `#F3F4F0` | texto principal |
| textSoft | `#B4B8BF` | parágrafos |
| muted | `#8B9099` | legendas, links do nav e do footer |
| line | `rgba(255,255,255,.08)` | bordas 1px (FAQ usa `.1`) |
| accent | `#C6F432` | Verde Kash: CTA, eyebrows, checks, banner final |
| accentSoft | `rgba(198,244,50,.14)` | pílula do hero |
| onAccent | `#0B0C0E` | texto sobre verde |

**Fonte:** Sora (Google Fonts), pesos 400/500/600/700/800. `-webkit-font-smoothing: antialiased`.

**Escala de texto**
- H1 hero: `clamp(48px, 7vw, 84px)`, 800, line-height .98, letter-spacing −0.05em, `text-wrap: balance`
- H2 de seção: `clamp(32–34px, 4–4.4vw, 46–52px)`, 800, lh 1.02–1.05, ls −0.04em
- H2 do CTA final: `clamp(40px, 6vw, 72px)`, 800, ls −0.05em
- Eyebrow: 13px, 600, uppercase, tracking .12em, cor accent
- Lead: 19px (hero), 17px (recursos), lh 1.55–1.6, cor textSoft
- Corpo: 14–16px · Footer: 13px

**Layout:** container `max-width: 1200px` (privacidade: 1100px), padding lateral 24px. Espaço entre seções: 120px no topo. Raios: cards 22–32px, botões 16px, pílulas 999px. Grids com `repeat(auto-fit, minmax(min(100%, Npx), 1fr))`, que já empilham no mobile sem media queries.

**Hover:** links de `muted` para `text`. Botões das lojas: fundo `#F3F4F0` → `#fff`. CTA verde: `filter: brightness(1.06)`.

---

## Landing (`Kash Landing.dc.html`)
1. **Nav sticky:** fundo `rgba(11,12,14,.85)` + `backdrop-filter: blur(12px)`, borda inferior `line`. Logo à esquerda (quadrado 34px r10 verde com "K" + "Kash" 20/800). Links âncora: Recursos (`#recursos`), Privacidade (`#privacidade`), Perguntas (`#perguntas`). Botão "Baixar grátis" (pílula verde 40px) leva a `#baixar`.
2. **Hero:** grid de 2 colunas (mínimo 420px por coluna).
   - Esquerda: pílula "App de finanças pra quem tá começando", H1 "Sua grana, sem mistério.", lead, badges App Store e Google Play (58px, r16, fundo claro, ícone + "Baixar na / App Store"), e o link "Use o Kash no navegador →".
   - Direita: mockup do celular 330×717 r40, sombra `0 40px 100px rgba(0,0,0,.6)`, com um brilho verde atrás (círculo 420px, opacity .18, blur 90px).
3. **Pilares:** 3 cards com borda (r22, p24): "3 toques pra lançar", "Sem surpresa na fatura", "Sem senha de banco".
4. **Recursos (`#recursos`):** 3 linhas alternando o lado (`row` / `row-reverse`), gap 56px, 96px entre linhas. Cada linha tem eyebrow, H2, parágrafo, 3 itens com check verde de 22px e um mockup 300×652 r36.
   - Cartões e parcelas: "Parcelou? A gente organiza."
   - Previsão: "Veja o mês que vem antes de ele chegar."
   - Metas: "Metas que saem do papel."
5. **"E ainda tem tudo isso.":** grade de 6 células separadas por linhas de 1px (gap 1px sobre fundo `line`, borda externa, r24). Itens: Contas bancárias, Contas fixas, Relatórios, Limite mensal, Ocultar valores, Tema claro e escuro.
6. **Privacidade (`#privacidade`):** card `surface` r32, padding `clamp(32px, 5vw, 64px)`, 2 colunas. À esquerda: eyebrow, H2 "Seus dados são seus. Ponto.", texto e link para a política. À direita: 3 itens em `surface2` r18 com ponto verde.
7. **FAQ (`#perguntas`):** container de 820px, acordeão com 6 perguntas. A primeira começa aberta e só uma fica aberta por vez. O "+" verde gira 45° quando abre (200ms). Linha divisória `rgba(255,255,255,.1)`.
8. **CTA final:** bloco verde r32, H2 "Feche o mês no verde.", subtítulo e 3 botões: App Store e Google Play (fundo preto, texto verde) e "Usar no navegador" (borda 2px preta).
9. **Footer:** logo pequeno, "© 2026 Kash", links Política de privacidade, Termos de uso e contato@kash.app.

## Política de privacidade (`Kash Privacidade.dc.html`)
- **Header:** logo (volta para a landing) e "← Voltar ao site".
- **Layout:** 2 colunas que viram 1 em telas estreitas.
  - **Índice** (240px, `position: sticky; top: 24px`) com links âncora para as 11 seções.
  - **Conteúdo** (máx. 680px): H1 `clamp(38px, 5vw, 56px)`, data "Última atualização: 1 de outubro de 2026", card verde "Resumo rápido", e as 11 seções (H2 22/700, parágrafos 15px lh 1.7 em textSoft, listas com marcador verde de 6px). Cada seção tem `scroll-margin-top: 24px`.
- **Seções:** 1 Quem somos · 2 Quais dados coletamos · 3 O que não coletamos · 4 Como usamos · 5 Bases legais · 6 Compartilhamento · 7 Armazenamento e segurança · 8 Por quanto tempo guardamos · 9 Seus direitos · 10 Menores de idade · 11 Alterações. O texto completo está em `sections` no script do arquivo.
- **Fechamento:** card "Ficou com dúvida?" com privacidade@kash.app.

## Para produção
- [ ] Trocar os mockups ao vivo do app por imagens (WebP 2x, com `loading="lazy"` abaixo da dobra).
- [ ] Colocar os links reais das lojas (App Store / Google Play) e da versão web.
- [ ] Trocar os e-mails de exemplo (`contato@`, `privacidade@kash.app`).
- [ ] **A política é um modelo e precisa de revisão jurídica.** Confirmar o que ela afirma: app gratuito, dados guardados no Brasil, sincronização entre app e web, exclusão em 30 dias, idade mínima de 15 anos.
- [ ] Criar a página de Termos de uso (o link já existe no footer).
- [ ] SEO: title, meta description e Open Graph (pode usar o feature graphic de `export/store/google-play/`) e favicon (`export/icon/`).
- [ ] FAQ com `<details>/<summary>` ou botão com `aria-expanded` para acessibilidade.

## Arquivos
- `Kash Landing.dc.html`: landing (referência)
- `Kash Privacidade.dc.html`: política de privacidade (referência)
- `Kash.dc.html`, `ios-frame.jsx`, `support.js`: necessários só para abrir a landing localmente com os mockups
