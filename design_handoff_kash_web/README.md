# Handoff: Kash Web — aplicação web (desktop)

## Sobre os arquivos
`Kash Web.dc.html` é um **protótipo de referência em HTML**, não código de produção. A tarefa é **recriar o design na stack do frontend web** (sugestão: React/Next.js + Tailwind ou CSS Modules), seguindo os padrões do projeto. Abra o arquivo no navegador para navegar; **toda a lógica de estado e as regras de cálculo** estão no bloco `<script data-dc-script>` do arquivo e servem como especificação de comportamento.

A versão web usa **o mesmo modelo de dados e as mesmas regras do app mobile**. Leia também `design_handoff_kash/README.md`, que tem a especificação completa de tokens, modelo de dados e regras de cálculo, para não duplicar a lógica. Back-end, API e autenticação devem ser compartilhados com o app.

## Fidelidade
**Alta (hi-fi).** Cores, tipografia, espaçamento e textos são finais. O design sai do protótipo do app; desenhar algo novo não faz parte desta tarefa.

---

## Tokens (CSS variables, iguais aos do app)
| Token | Escuro (padrão) | Claro |
|---|---|---|
| `--bg` | `#0B0C0E` | `#F4F5EF` |
| `--surface` | `#16181C` | `#FFFFFF` |
| `--surface2` | `#1F2227` | `#ECEEE6` |
| `--text` | `#F3F4F0` | `#14161A` |
| `--muted` | `#8B9099` | `#6B7079` |
| `--line` | `rgba(255,255,255,.08)` | `rgba(0,0,0,.08)` |
| `--accent` | `#C6F432` | `#C6F432` |
| `--accentText` | `#C6F432` | `#4E7A00` |
| `--onaccent` | `#0B0C0E` | `#0B0C0E` |
| `--neg` | `#FF7A6B` | `#D9442F` |
| `--posSoft` | `rgba(198,244,50,.14)` | `rgba(141,196,20,.16)` |
| `--negSoft` | `rgba(255,122,107,.14)` | `rgba(217,68,47,.12)` |

O tema é trocado pela classe `light` no `<body>`. Cores de categoria e gradientes de cartão são os mesmos do app (ver README do app).

**Fonte:** Sora 400–800 (Google Fonts).
**Escala:** título de página 30/800 (ls −0.035em) · valor grande 34–36/800 · título de card 16/700 · corpo 14 · meta 12 · eyebrow 11/600 uppercase (tracking .1em).
**Raios:** cards 22–24 · modais 26 · botões 14–16 · chips 999 · inputs 14.
**Sombras:** modal `0 30px 80px rgba(0,0,0,.4)` · toast `0 12px 30px rgba(0,0,0,.3)`.
**Animações:** modal com fade no overlay e translateY(24px→0) em 300ms `cubic-bezier(.2,.8,.2,1)` · barras de progresso em 400ms · switches em 200ms.

---

## Estrutura e layout
- **Login** (antes de entrar): grid de 2 colunas (mínimo 360px cada; empilha em telas estreitas).
  - Esquerda: painel verde `#C6F432` com logo, título "Sua grana, sem mistério." (64/800) e 3 benefícios numerados.
  - Direita: formulário centralizado (máx. 400px) com e-mail, senha, "Esqueci a senha", **Entrar** e **Criar conta grátis**.
- **App:** `display:flex`.
  - **Sidebar** de 244px, `position: sticky; height: 100vh`, borda direita `--line`. De cima para baixo:
    - logo;
    - botão **Lançar gasto** (verde, 46px, sempre visível);
    - navegação com 7 itens de 42px: Início, Cartões, Contas bancárias, Contas fixas, Metas, Relatório, Previsão. Item ativo com fundo `--accent` e texto `--onaccent`; inativo em `--muted`, com hover `--surface`;
    - espaçador;
    - cartão do perfil (avatar + nome), que abre o Perfil.
    - Todos os filhos da sidebar usam `flex: none`, para não encolher em telas baixas.
  - **Main:** padding 32px 40px, conteúdo com `max-width: 1200px` centralizado.
    - Cabeçalho da página: título e subtítulo à esquerda; botões **Ocultar valores** e **Tema claro/escuro** à direita.
- **Responsividade:** todas as grades usam `repeat(auto-fit, minmax(N, 1fr))`. Abaixo de ~900px, a sidebar deve virar um menu recolhível (não está no protótipo).

## Telas
1. **Início:**
   - Linha de 3 cards:
     - **Saldo total**, com os chips "entrou" e "saiu";
     - **Gastos do mês**, card verde com barra de orçamento; clique leva ao Relatório;
     - **Previsão de gastos**, com mini-gráfico de 6 barras; clique leva à Previsão.
   - Embaixo, 2 colunas:
     - **Lançamentos**: lista completa com ícone da categoria, título, meta e valor;
     - **Próximas contas** (badge "DIA N") e resumo das **Metas** com barras.
2. **Cartões:**
   - Fileira de cartões 300×176 com gradiente; o selecionado tem outline verde e scale 1, os outros scale .96.
   - Ao lado, botão tracejado "+ Novo cartão".
   - Embaixo, 2 colunas:
     - à esquerda, **Limite usado** (barra, disponível/limite, fechamento e vencimento) e **Parcelas em aberto**;
     - à direita, **Lançamentos da fatura**, com estado vazio.
3. **Contas bancárias:** card com o total e grade de contas (ícone colorido, nome, tipo, saldo). Último item: "+ Adicionar conta".
4. **Contas fixas:**
   - 3 KPIs: A pagar (em `--neg`), Pagas N/M e Total mensal.
   - Lista clicável: cada clique alterna pago/não pago. Conta paga mostra o check verde, o nome riscado e opacidade .55.
5. **Metas:**
   - Grade de metas: anel de 88px com a % no centro, nome, valores, ETA e botão "+ Guardar R$ 50".
   - Card tracejado "+ Nova meta".
   - Card verde **Dica da semana**.
6. **Relatório:**
   - Card com o total do mês, a variação em relação ao mês anterior e o gráfico de 6 meses (mês atual em verde).
   - Card **Por categoria** com barras coloridas.
7. **Previsão:**
   - Card com o valor comprometido no próximo mês, a % do limite mensal e barras empilhadas de 6 meses (parcelas em verde em cima, contas fixas em `--muted` embaixo).
   - Clicar num mês seleciona (opacidade 1 / .45) e atualiza a lista do mês ao lado (badge "N/M" para parcela, "FIXA" para conta fixa).
8. **Perfil:**
   - 2 colunas:
     - à esquerda, identidade + grupos **Conta** (Dados pessoais, Segurança, Limite mensal) e **Preferências** (switch de tema, switch de lembrete por e-mail, moeda);
     - à direita, grupo **Sobre** (Termos, Privacidade, Ajuda, "Versão Web 1.0.0").
   - Botões **Sair da conta** e **Excluir conta**.
9. **Termos de uso / Política de privacidade:** coluna de texto (máx. 720px) com "← Voltar ao perfil".

## Modais (centralizados, máx. 520px, overlay `rgba(0,0,0,.55)`; clicar fora fecha)
- **Lançar gasto:**
  - Campo de valor grande (34/800). A digitação é em **centavos**: só dígitos, até 8; "12990" vira R$ 129,90.
  - Chips de categoria e de origem ("Pago com": cartões + contas).
  - **Se a origem for um cartão**, aparece a linha de parcelamento com −/+ (1–24x), "Nx de R$ X" e o mês da última parcela.
  - Descrição e botão **Salvar gasto**, desabilitado com valor 0.
  - Ao salvar:
    - cria o lançamento (no parcelado, "Título (1/N)" com valor/N);
    - debita a conta, se a origem for uma conta;
    - cria o plano de parcelas, se N > 1;
    - mostra o toast.
- **Novo cartão:**
  - Preview ao vivo do cartão e 4 cores.
  - Campos: nome, últimos 4 dígitos (só números), limite, dia de fechamento e dia de vencimento.
  - O botão habilita com nome + 4 dígitos + limite > 0.
- **Nova conta:** tipo (Conta corrente, Poupança, Carteira, Investimento), apelido, banco, saldo atual e 5 cores. O botão habilita com o apelido preenchido.
- **Excluir conta:**
  - Checkbox "Entendi que vou perder todos os meus dados".
  - "Excluir definitivamente" só fica ativo com o checkbox marcado.
  - Ao excluir, volta para o login.

## Toast
Canto inferior direito (24px), fundo `--text`, texto `--bg`, ponto verde. Some depois de 2,2s.

---

## Diferenças em relação ao app mobile
- Navegação em sidebar, sem tab bar. Relatório e Previsão são itens de primeiro nível.
- Contas bancárias e Contas fixas viraram dois itens de menu (no app são abas de uma mesma tela).
- Lançar gasto usa modal + teclado físico, sem o teclado numérico na tela.
- Sem splash e sem onboarding: o fluxo começa no login.
- **Desafios de economia ainda não existem na web** (o app já tem). Para portar, use como referência a tela de Metas e as páginas `challenges` / `challenge` de `Kash.dc.html`.
- Lembretes de conta são por e-mail (no app, por push).

## Pendências do produto (não desenhadas)
- [ ] Formulários de nova conta fixa, nova meta e editar perfil.
- [ ] Editar/excluir lançamentos, cartões e contas.
- [ ] Lançar entrada, pagar fatura, transferir entre contas.
- [ ] Busca e filtros de lançamentos; navegação entre meses.
- [ ] Sidebar recolhível abaixo de ~900px.
- [ ] Atalhos de teclado (sugestão: `N` abre Lançar gasto, `Esc` fecha modais).
- [ ] Acessibilidade: `aria-current` no item ativo, foco preso dentro dos modais, `role="switch"` nos toggles.

## Arquivos
- `Kash Web.dc.html`: protótipo completo da web (markup + lógica)
- `support.js`: runtime necessário só para abrir o protótipo localmente (não precisa ser portado)
- `Kash.dc.html` + `ios-frame.jsx`: app mobile, como referência dos Desafios e de comportamento compartilhado
