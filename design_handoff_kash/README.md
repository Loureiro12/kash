# Handoff: Kash — app de finanças pessoais (mobile)

## Visão geral
Kash é um app mobile de finanças pessoais para 15–30 anos, com **lançamento manual** (sem Open Finance). Funcionalidades: onboarding/login, resumo (Início), cartões de crédito com fatura e parcelas, contas bancárias, contas fixas, lançamento de gastos (à vista ou parcelado), metas de economia, relatório mensal, previsão de gastos futuros, perfil (termos, privacidade, exclusão de conta).

## Sobre os arquivos de design
`Kash.dc.html` (+ `ios-frame.jsx`, `support.js`) é um **protótipo de referência em HTML**, não código de produção. A tarefa é **recriar este design no ambiente do app** (React Native / Flutter / SwiftUI / Kotlin — se nada existir, sugerimos React Native + Expo ou Flutter) usando os padrões da base. Abra `Kash.dc.html` no navegador para navegar no protótipo; toda a lógica de estado está no bloco `<script data-dc-script>` dentro do arquivo e serve como especificação de comportamento.

## Fidelidade
**Alta (hi-fi).** Cores, tipografia, espaçamentos, raios e copy são finais. Recriar fielmente.

---

## Design tokens

### Cor
Tema escuro (padrão) / Tema claro — ambos obrigatórios.

| Token | Escuro | Claro | Uso |
|---|---|---|---|
| `bg` | `#0B0C0E` | `#F4F5EF` | fundo das telas |
| `surface` | `#16181C` | `#FFFFFF` | cards, inputs, tab bar |
| `surface2` | `#1F2227` | `#ECEEE6` | trilhos de progresso, teclas, chips neutros |
| `text` | `#F3F4F0` | `#14161A` | texto primário |
| `muted` | `#8B9099` | `#6B7079` | texto secundário, ícones inativos |
| `line` | `rgba(255,255,255,.08)` | `rgba(0,0,0,.08)` | bordas 1px |
| `accent` | `#C6F432` | `#C6F432` | **Verde Kash** — fills (botão +, CTA, progresso, card “Gastos do mês”) |
| `accentText` | `#C6F432` | `#4E7A00` | verde como texto/ícone (contraste em fundo claro) |
| `onaccent` | `#0B0C0E` | `#0B0C0E` | texto sobre verde |
| `neg` | `#FF7A6B` | `#D9442F` | saídas, perigo (excluir conta) |
| `posSoft` | `rgba(198,244,50,.14)` | `rgba(141,196,20,.16)` | chip “entrou”, badges de parcela |
| `negSoft` | `rgba(255,122,107,.14)` | `rgba(217,68,47,.12)` | chip “saiu”, botão excluir |

Cores de categoria (iguais nos dois temas): Comida `#FFB86B` · Transporte `#6BC5FF` · Lazer `#D98BFF` · Mercado `#7EE0A8` · Assinaturas `#FF8FB1` · Outros `#AAB2BF`. Ícone de categoria = quadrado 40×40 r13 com fundo `cor + 15% alpha` e inicial do título na cor.

Gradientes de cartão (4 opções): verde `linear-gradient(135deg,#D7FF5C,#9ED61E)` tinta `#0B0C0E` · grafite `linear-gradient(135deg,#2B2F36,#111317)` tinta `#F3F4F0` · azul `linear-gradient(135deg,#8FD3FF,#4C9BE8)` · roxo `linear-gradient(135deg,#E6A6FF,#A85CE0)`. Avatar: `linear-gradient(135deg,#C6F432,#5BB3FF)`.

### Tipografia — **Sora** (Google Fonts), pesos 400/500/600/700/800
- Display onboarding: 46/1.02, 800, letter-spacing −0.04em
- Título de tela: 26, 800, −0.03em · Título de página interna (com voltar): 22, 800, −0.03em
- Saldo total: 36, 800, −0.03em · Valor em card grande: 30, 800 · Valor do sheet: 42, 800, −0.04em
- Seção: 15, 700 · Título de item: 14, 600 · Valor de item: 14–15, 700
- Corpo: 13, 400, line-height 1.5–1.6 · Meta/legenda: 12 (muted) · Micro: 11
- Label de tab: 10, 600 · Eyebrow (PERFIL): 11, 600, uppercase, tracking .1em
- Botão CTA: 16, 700 · Botão secundário: 14–15, 600 · Chip: 12, 600

### Espaçamento e forma
- Padding horizontal da tela: 20 · topo (sob status bar): 62 · fundo: 110 (tab bar flutuante)
- Gaps: 10 entre cards em lista, 12 entre blocos, 24–26 entre seções
- Raios: cards 22–24 · itens de lista 18 · inputs/teclas 14 · chips 999 · botões CTA 18 · cartão de crédito 22 · sheet 30 (topo) · tab bar 999
- Bordas: 1px `line` em todos os cards/inputs. Botões “adicionar” usam borda **tracejada** `line`
- Sombras: tab bar `0 10px 30px rgba(0,0,0,.25)` · botão + `0 8px 20px rgba(198,244,50,.35)`
- Alvos de toque mínimos 44px (botões redondos 40 ok por padding)

### Animações
- Fade de tela/overlay: 200–300ms ease
- Sheets: translateY(40px→0) + opacity, 300ms `cubic-bezier(.2,.8,.2,1)`
- Barras de progresso: width/height 400ms · switch: 200ms · cartão selecionado scale .96→1 em 200ms

---

## Navegação
- Fluxo: **Onboarding → Login → App**. Sair da conta → Login. Excluir conta → Onboarding.
- Tab bar flutuante (pílula, 66px, 20px das laterais, 32px do fundo) com 4 abas + botão central **+** (54px redondo verde): **Início · Cartões · [+] · Contas · Metas**. Aba ativa em `accentText`, inativas em `muted`.
- Páginas internas (com botão voltar redondo 40px): Relatório, Previsão, Perfil, Termos de uso, Política de privacidade. Ao abrir uma página interna, nenhuma aba fica ativa.
- Sheets (bottom sheet com overlay `rgba(0,0,0,.5)`): Lançar gasto, Novo cartão, Nova conta, Confirmar exclusão.

---

## Telas

### 1. Onboarding
Fundo integral `#C6F432`, texto `#0B0C0E`. Wordmark “Kash” 28/800 no topo (padding 120 top, 28 lateral). Centro: título “Sua grana, sem mistério.”, parágrafo “Cartões, contas e boletos num lugar só. Lance um gasto em 3 toques e saiba quanto sobra até o fim do mês.” (15, opacidade .8, max 300px), 3 bullets numerados (círculo 22px preto com número verde): “Lance gastos de cartão e débito” · “Nunca mais esqueça uma conta fixa” · “Crie metas e veja o dinheiro crescer”. CTA “Começar” 56px, fundo `#0B0C0E`, texto verde.

### 2. Login
Logo quadrado 44px r13 verde com “K”. “Bem-vindo de volta” 30/800; sub “Entre pra ver como anda sua grana.” Inputs 52px r14 (`surface`, borda `line`): “E-mail ou celular”, “Senha”. Link “Esqueci a senha” à direita (accentText, 13/500). Rodapé: CTA “Entrar” (verde) + “Criar conta grátis” (outline). Ambos levam ao app no protótipo.

### 3. Início
1. Header: avatar 40px (gradiente) + “Bom dia/tarde/noite,” (12 muted) + nome (16/700). **Toque no avatar/nome abre Perfil.** À direita, botão olho 40px redondo: alterna ocultar valores (`R$ ••••`).
2. Card **Saldo total** (surface, r24, p22/20): label 12 muted, valor 36/800, chips `↑ R$ X entrou` (posSoft/accentText) e `↓ R$ Y saiu` (negSoft/neg), 12/600, nowrap.
3. Card **Gastos do mês** (fundo verde, r24, clicável → Relatório): “Gastos do mês” / “ver relatório →”, valor 26/800 e “de R$ 1.800,00”, barra 8px (trilho `rgba(11,12,14,.18)`, fill `#0B0C0E`) = gasto/limite, mensagem “Sobram R$ X pra fechar o mês no verde” ou “Passou R$ X do limite do mês”.
4. Grid 3 colunas de ações (surface, r18, p14, ícone 30px r9 + label 12/600): **Lançar gasto** (abre sheet) · **Contas fixas** (vai a Contas › Fixas) · **Guardar** (vai a Metas).
5. **Próximas contas**: título + “ver todas”; carrossel horizontal de cards 140px (r18): “vence dia N” / nome / valor. Lista apenas contas **não pagas**.
6. Card **Previsão de gastos** (surface, r22, clicável → Previsão): mini-gráfico de 6 barras verdes 7px + “Previsão de gastos” + “novembro: R$ X já comprometidos” + chevron.
7. **Últimos lançamentos**: 6 itens; linha = ícone categoria 40px, título 14/600, meta “Hoje · Comida · Conta corrente” (12 muted), valor 14/700 (`− R$ X` texto normal; entradas `+ R$ X` em accentText). Separador 1px `line`.

### 4. Cartões
Título “Cartões” 26/800 + “Toque num cartão pra ver a fatura.” Carrossel horizontal de cartões **300×176, r22, p20** (gradiente; nome 14/700, “kash” 14/800 à direita; “Fatura atual” 11, valor 26/800, “•••• 4821” e “fecha 28 out” 12/500). Selecionado: outline 2px `accent` offset 3px, scale 1; demais scale .96. Último item: botão tracejado 120×176 “+ Novo cartão”.
Card **Limite usado**: “%” à direita, barra 10px verde, “Disponível **R$ X**” / “Limite R$ Y”, dois blocos (surface2, r14) Fechamento / Vencimento.
**Parcelas em aberto** (só se houver para o cartão): card por plano — título, “R$ X/mês”, barra 6px (pagas/total), “3 de 6 pagas” / “termina em março · falta R$ Y”.
**Lançamentos da fatura**: mesma linha de lançamento filtrada pelo cartão; vazio → “Nenhum gasto nesse cartão ainda.”

### 5. Contas (segmentado **Bancárias | Fixas**)
Segmentado: container surface r14 p4; ativo fundo `text`, texto `bg`; inativo transparente/muted.
**Bancárias**: card “Em todas as contas” + valor 30/800; lista de contas (ícone 42px r13 na cor da conta com inicial, nome 14/600, tipo 12 muted, saldo 15/700); botão tracejado “+ Adicionar conta” → sheet Nova conta.
**Fixas**: dois cards lado a lado “A pagar” (valor em `neg`) e “Pagas” (`3/5` em accentText); dica “Toque pra marcar como paga”; lista — item clicável alterna pago: check redondo 26px (borda muted → fundo verde com ✓ preto), nome (riscado se pago), status “Vence dia N”/“Paga”, valor; item pago com opacidade .55. Botão tracejado “+ Nova conta fixa” (sem fluxo no protótipo).

### 6. Metas
Título “Metas” + “Você já guardou **R$ X** no total.” Card por meta (surface, r22, p18): anel SVG 68px (raio 28, stroke 7, trilho surface2, progresso na cor da meta, round cap, rotação −90°) com “NN%” centralizado em HTML sobreposto (13/700); nome 15/700, “R$ guardado de R$ meta”, ETA “Faltam ~N meses nesse ritmo” / “Meta batida!”; botão “+ R$ 50” (posSoft/accentText, r12) soma 50 (até o alvo) e mostra toast. Botão tracejado “+ Nova meta”. Card verde **Dica da semana**: “Você gastou R$ X com {categoria top} este mês. Guardar 10% disso já adianta sua meta em R$ Y.”

### 7. Relatório (página interna)
Card: “Gastos · outubro”, total 30/800, delta “N% a menos/mais que setembro” (accentText 12/600); gráfico de 6 barras (meses mai–out, altura relativa ao máximo, mês atual em `accent`, demais `surface2`, label 11/600). **Por categoria**: linha por categoria (quadrado 10px cor, nome, “R$ X · N%”) + barra 8px na cor.

### 8. Previsão (página interna)
Texto “Quanto já está comprometido nos próximos meses com contas fixas e parcelas do cartão.” Card: “Comprometido em {próximo mês}”, total 30/800, “N% do seu limite mensal de R$ 1.800,00”; gráfico 6 meses com **barras empilhadas** (parcelas em `accent` em cima, contas fixas em `muted` embaixo), mês selecionado opacidade 1, outros .45; toque seleciona. Legenda. Abaixo: “Em {mês}” + total; lista de itens do mês: parcelas (badge posSoft “6/12”, título “Celular novo (6/12)”, sub nome do cartão) e contas fixas (badge surface2 “FIXA”, sub “Conta fixa · dia N”).

### 9. Perfil (página interna)
Card de identidade (avatar 56px, nome, e-mail, botão “Editar”). Grupos com eyebrow e cards de lista (linhas 15px/16px, separador `line`, chevron 8×14):
- **Conta**: Dados pessoais (Nome, e-mail, celular) · Segurança (Senha, biometria) · Limite mensal (R$ 1.800,00)
- **Preferências**: Tema escuro (switch 44×26, knob 20px, ativo verde) · Lembrete de contas “Aviso 2 dias antes do vencimento” (switch) · Moeda (Real R$)
- **Sobre**: Termos de uso → página · Política de privacidade → página · Ajuda e suporte · Versão 1.0.0
- Botões: “Sair da conta” (outline, → Login) · “Excluir conta” (negSoft/neg → sheet)

### 10. Termos / Privacidade (páginas internas)
Título, “Atualizado em 1 de outubro de 2026”, seções (título 14/700 + parágrafo 13 muted). Conteúdo completo está no `docSections` do protótipo (substituir pelo texto jurídico real).

### Sheet — Lançar gasto
Handle 40×4; título “Lançar gasto” + botão × 32px. Valor 42/800 centralizado (muted até > 0). Chips de categoria (6, roláveis; ativo fundo `text`/texto `bg`, com ponto na cor). Chips de origem (cartões “Nome •••• 1234” + contas; ativo posSoft/accentText, borda accentText). Input “Descrição (ex.: lanche com a galera)” 46px. **Se origem for cartão**: linha de parcelamento 50px — “À vista” / “Toque em + para parcelar” ou “6x de R$ X” / “Última parcela em março · total R$ Y”; botões −/+ 38px e “Nx” (1–24). Teclado numérico 3×4 (1–9, 00, 0, ⌫; teclas 50px r14 surface, 20/600; digitação em centavos, máx 8 dígitos). CTA “Salvar gasto” (verde quando valor > 0; surface2/muted desabilitado).
Ao salvar: cria lançamento (título = descrição ou categoria; parcelado → “Título (1/N)” com valor/N), debita saldo se origem for conta, cria plano de parcelas se N > 1, fecha sheet, toast.

### Sheet — Novo cartão
Preview ao vivo do cartão (150px) com nome, limite e “•••• 12••”. 4 swatches de cor (34px, selecionado outline `text`). Inputs: nome; grid 2 col “Últimos 4 dígitos” (numérico, 4) + “Limite (R$)”; grid 2 col com labels “Dia do fechamento” / “Dia do vencimento”. CTA “Adicionar cartão” habilitado com nome + 4 dígitos + limite > 0. Novo cartão fica selecionado.

### Sheet — Nova conta
Chips “Tipo de conta”: Conta corrente · Poupança · Carteira · Investimento. Inputs: Apelido, Banco ou instituição, “Saldo atual” (decimal). 5 swatches 30px. CTA “Adicionar conta” habilitado com apelido preenchido. Tipo exibido como “Poupança · Banco X”.

### Sheet — Excluir conta
Ícone lixeira em negSoft; “Excluir sua conta?” 22/800; texto “Isso apaga para sempre seus lançamentos, cartões, contas fixas e metas. Não dá pra desfazer.”; checkbox “Entendi que vou perder todos os meus dados” (marcado → fundo `neg`); botão “Excluir definitivamente” só ativo com checkbox (fundo `neg`, texto branco); “Cancelar”.

### Toast
Topo (66px), fundo `text`, texto `bg` 13/600, ponto verde 8px, some após 2,2s. Mensagens: “R$ X lançado em Comida”, “6x de R$ X no cartão”, “R$ 50,00 guardados em “Meta””, “Cartão “X” adicionado”, “Conta “X” adicionada”, “Conta excluída”.

---

## Modelo de dados
```ts
Account { id; name; kind; balance: number; color: hex }
Card    { id; name; last: '4821'; limit; closes: 'dd mmm'; due: 'dd mmm'; grad; ink }
Tx      { id; title; cat; amount: number /* negativo = saída */; date; src: Account.id | Card.id }
Bill    { id; name; amount; due: 1..31; paid: boolean }          // conta fixa (mensal)
Goal    { id; name; target; saved; color; monthly /* aporte estimado p/ ETA */ }
Plan    { id; title; cat; src: Card.id; n: parcelas; cur: parcelas já lançadas; per: valor da parcela }
Settings{ theme: 'dark'|'light'; hideValues; billReminder; monthlyBudget = 1800 }
```
**Regras de cálculo**
- Saldo total = Σ accounts.balance · Entradas/saídas do mês = Σ txs por sinal · Fatura do cartão = Σ |txs| com `src = card` · Disponível = limit − fatura
- Orçamento: `pct = min(100, gasto/1800)`
- Metas: `pct = saved/target`; ETA = `ceil((target − saved)/monthly)` meses
- Relatório: categorias = Σ |saídas| agrupado por `cat`, ordenado desc
- Previsão mês k (1..6): `Σ bills.amount` + `Σ plan.per` para planos com `cur + k ≤ n`
- Parcelado: `per = round(total/n, 2)`; 1ª parcela entra hoje; a cada fechamento de fatura, `cur++` e novo Tx “Título (cur/n)”
- Virada de mês: resetar `bill.paid`, gerar parcelas, arquivar txs do mês (não implementado no protótipo)

**Em aberto para o produto:** formulários de “Nova conta fixa”, “Nova meta”, “Editar perfil”, editar/excluir lançamentos, auth real, persistência.

## Assets
Sem imagens. Ícones são SVG inline stroke 2.2 (casa, cartão, carteira, alvo, olho, calendário, lixeira, chevron, check) — substituir por um set equivalente (ex.: Lucide). Fonte Sora via Google Fonts ou bundle local.

## Arquivos
- `Kash.dc.html` — protótipo completo (markup + lógica de estado em `<script data-dc-script>`)
- `ios-frame.jsx`, `support.js` — runtime do protótipo (apenas para abrir o HTML; não portar)
