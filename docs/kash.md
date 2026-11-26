# Kash — visão geral do produto e do projeto

> Documento de referência: o que o Kash é, tudo o que ele faz (app, web e backend), como está construído, como é publicado e o que está pendente.
> Atualizado em 26/11/2026: **1.2.0** aprovada na App Store; **1.3.0** em preparação.
> Detalhes que mudam com frequência ficam nos documentos de origem: [`README.md`](../README.md) (arquitetura e comandos), [`apps/mobile/CHANGELOG.md`](../apps/mobile/CHANGELOG.md) (versões), [`docs/release.md`](release.md) (publicação) e [`apps/web/README.md`](../apps/web/README.md) (site e Kash web).

## Sumário

1. [O que é o Kash](#1-o-que-é-o-kash)
2. [Onde ele existe](#2-onde-ele-existe)
3. [Funcionalidades do app](#3-funcionalidades-do-app)
4. [Kash web e site](#4-kash-web-e-site)
5. [Regras de negócio importantes](#5-regras-de-negócio-importantes)
6. [Inteligência artificial (Claude)](#6-inteligência-artificial-claude)
7. [Privacidade e segurança](#7-privacidade-e-segurança)
8. [Arquitetura técnica](#8-arquitetura-técnica)
9. [Backend (Supabase)](#9-backend-supabase)
10. [Testes e qualidade](#10-testes-e-qualidade)
11. [Publicação e versões](#11-publicação-e-versões)
12. [Contas, serviços e identificadores](#12-contas-serviços-e-identificadores)
13. [Pendências e riscos conhecidos](#13-pendências-e-riscos-conhecidos)
14. [Como rodar o projeto](#14-como-rodar-o-projeto)

---

## 1. O que é o Kash

**"Sua grana, sem mistério."** App de finanças pessoais para quem tem entre 15 e 30 anos e está começando a organizar o dinheiro.

A proposta:
- **Tudo num lugar só:** cartões, contas, boletos, parcelas e metas.
- **Lançar rápido:** um gasto em 3 toques (ou escrevendo para o assistente, ou pelo Toque Atrás do iPhone).
- **Uma resposta clara:** "quanto sobra até o fim do mês?" e "vale a pena comprar isso?".

O Kash **não se conecta ao banco** (não há Open Finance): os dados são os que a pessoa lança ou importa de arquivos (PDF da fatura, OFX, CSV).

## 2. Onde ele existe

| Produto | Tecnologia | Endereço / identificador | Estado |
|---|---|---|---|
| App iOS | React Native (Expo) | `com.andreloureiro.kash` · App Store Connect `6820170870` | 1.1.0 (build 12) na App Store |
| App Android | React Native (Expo) | `com.andreloureiro.kash` | 1.1.0 (versionCode 5), AAB gerado para a Play Console |
| Widget iOS | SwiftUI (WidgetKit) | `com.andreloureiro.kash.widget` | desde a 1.2.0 |
| Kash web | Next.js 16 | www.kash.app.br (`/entrar`, `/app`) | no ar |
| Site institucional | Next.js 16 | www.kash.app.br (`/`, `/privacidade`, `/excluir-conta`) | no ar |
| Backend | Supabase (Postgres, Auth, Edge Functions) | projeto `kash` (ref `sqpxugyjnlwpkzuxzcpg`, `ca-central-1`) | produção |

Mesma conta e mesmos dados no app e na web, com sincronização em tempo real.

## 3. Funcionalidades do app

Navegação: barra de abas flutuante com **Início, Cartões, botão central "+" (lançar), Contas e Metas**; Perfil e páginas internas abrem por cima.

### 3.1 Conta, acesso e primeiro uso

- **Cadastro e login** com e-mail e senha (confirmação de e-mail ligada).
- **Entrar com Apple e Google**: no iPhone, a folha nativa da Apple; o Google (e a Apple no Android) abre a janela segura do sistema. Quem entra só por Apple/Google vê "Você entra com …" em Segurança, no lugar de "Alterar senha".
- **Esqueci a senha**: código enviado por e-mail (6 dígitos local, 8 em produção), digitado no app; a sessão de recuperação só permite criar a nova senha. Link `kash://reset-password` como atalho.
- **Onboarding** (telas de apresentação antes do login).
- **Boas-vindas em 3 passos** para conta nova: contas com o saldo de hoje, cartão (opcional) e limite mensal.
- **Card "Primeiros passos"** no Início: conta, 1º gasto, cartão, conta fixa e meta. Marca sozinho pelos dados, pode ser escondido e volta pelo Perfil. Estado compartilhado com a web.
- **Face ID / Touch ID / digital**: liga em Perfil › Segurança depois de confirmar a biometria; o app abre trancado e pede de novo ao voltar de mais de 30 s em segundo plano. Preferência do aparelho, desligada no logout.
- **Splash animada** e **esqueleto de carregamento** no Início enquanto os dados chegam (nunca mostra números de exemplo). Lançamentos, Relatório, Previsão e Categoria também esperam os dados. *(1.2.0)*

### 3.2 Início

- **Saudação e saldo total** das contas, com botão de **ocultar valores** (vale no app e na web).
- **Gastos do mês × limite mensal**, com barra e "Sobram R$ X pra fechar o mês no verde". Com o limite dividido, duas barras: cartão e restante.
- **Atalhos "Hoje" e "Esta semana"**: quanto saiu e a comparação com o período anterior; abrem o relatório no período. *(1.2.0)*
- **Ações rápidas**, **mini-previsão** dos próximos meses, **lançamentos recentes**, **próximas contas** (contas fixas e faturas fechadas a pagar) e **metas**.
- **Balão do Assistente Kash** no canto inferior direito. *(1.2.0)*

### 3.3 Lançamentos

- **Lançar gasto, entrada ou transferência** pelo "+":
  - **Valor:** digitado no teclado numérico do celular, que já abre sozinho num lançamento novo. Os números entram pelos centavos (1450 = R$ 14,50).
  - **Campos:** categoria, origem (cartão ou conta) e descrição.
  - **Data:** um calendário do mês, com os atalhos Hoje, Ontem e Anteontem (não aceita datas futuras).
  - **Troca de tipo:** Gasto · Entrada · Transferência, nos dois sentidos, levando o valor, a descrição e a data.
  - **Sugestão pela descrição:** uma descrição já usada sugere a categoria e a origem daquela vez, sem passar por cima da escolha manual.
- **Compra parcelada** no cartão, de 1 a 24x, com "Valor digitado: Total ou Parcela".
- **Compra parcelada antiga**: informe o mês da 1ª parcela (até 23 meses atrás); o app calcula quais já foram pagas e lança só a do mês. Compra já quitada não pode ser salva.
- **Transferência entre contas** (Contas › Transferir, ou "Transferência" no lançamento): não conta como gasto nem entrada; aparece numa linha só ("Corrente → Poupança") e tem filtro próprio.
- **Lista completa por mês** (Lançamentos), com filtros de tipo e categoria.
- **Editar e excluir** com **Desfazer**. Numa parcela: excluir só esta ou todas; trocar o cartão move o parcelamento inteiro.
- **Lançar pelo Toque Atrás, Siri, app Atalhos, Spotlight e botão de Ação** (iPhone): ações "Lançar gasto" e "Lançar entrada" abrem direto no lançamento. Também pelo link `com.andreloureiro.kash://lancar?tipo=gasto|entrada`. Com Face ID ligado, pede o desbloqueio antes.

### 3.4 Cartões de crédito

- Cartões com **limite, fatura atual, disponível**, dia de fechamento e de vencimento.
- **Cor do cartão**: 4 gradientes prontos ou cor personalizada (seletor completo, contraste do texto calculado).
- **Fatura fechada** na virada de mês, com aviso e **Pagar fatura** debitando uma conta (o pagamento não conta como gasto).
- **Parcelas em aberto**, cobranças recorrentes no cartão e lançamentos do cartão.
- **Importar fatura** (ver 3.10).

### 3.5 Contas

- Conta corrente, poupança, carteira e investimento, com **saldo calculado** (saldo inicial + lançamentos) e cor personalizada.
- **Transferir** entre contas.
- **Importar extrato** (ver 3.10).

### 3.6 Contas fixas

- Aluguel, internet, assinaturas etc., cobradas numa conta ou num cartão, com dia de vencimento e categoria.
- **Marcar como paga** gera o lançamento; desmarcar remove. Voltam a "a pagar" todo mês.
- **Assinaturas detectadas** *(1.3.0)*: card "Encontramos cobranças que se repetem" no topo de Contas › Fixas.
  - **Regras** (`detectRecurring` em `@kash/domain`): mesma descrição, no máximo uma vez por mês, em pelo menos 3 dos últimos 6 meses (sem pular mais de um mês), em dias parecidos (até 7 de diferença) e com valores perto da mediana (±25%). A última cobrança precisa ser dos últimos 55 dias. Ficam de fora parcelas, transferências, fatura e o que já é conta fixa (nome igual ou contido).
  - **Virar conta fixa** usa nome, valor, dia, categoria e cartão/conta da última cobrança. Se a cobrança deste mês já existe, a conta nasce **paga e ligada** a ela (`link_bill_payment`, coluna `bills.paid_tx_linked`): não cria outro lançamento, e desmarcar não apaga o gasto real.
  - **Ignorar** fica guardado no aparelho.
  - **Aumento de preço** (≥ 3% e ≥ R$ 1) aparece no card e vira alerta ("Netflix ficou mais cara"), que abre Contas › Fixas.
  - **Assistente:** as recorrentes ainda não cadastradas vão no resumo financeiro, então ele também sabe delas.

### 3.7 Metas

- Valor alvo, valor guardado, **anel de progresso**, aporte mensal planejado e previsão de quando termina.
- Conta onde o dinheiro fica e **dia do depósito**, com lembrete quando o depósito do mês está pendente.
- **Guardar** (depósito) registra o valor na meta.

### 3.8 Relatórios

- **Relatório por dia, semana e mês** *(1.2.0)*:
  - quanto saiu, quanto entrou e quanto sobrou ou faltou;
  - comparação com o período anterior; no período em andamento, até o mesmo ponto ("a semana passada até quarta");
  - **ritmo contra o limite** (dia = limite ÷ dias do mês; semana = 7 dias) e, no mês atual, a projeção "no ritmo atual você fecha o mês em…";
  - média dos períodos anteriores (só desde o 1º lançamento), dia de maior gasto, categoria principal e quantidade de gastos;
  - gráfico por dia (tocar numa barra abre o dia) e navegação para períodos anteriores;
  - por categoria e maiores gastos; na visão Dia, a lista completa do dia.
  - A semana começa na segunda.
- **Gastos por categoria** (tocar numa categoria): barras dos últimos 6 meses, total e comparação, peso da categoria no mês, média por lançamento, "Onde você mais gastou" e os lançamentos. Chips trocam de categoria.

### 3.9 Previsão

- Próximos **6 meses** com o que já está comprometido em **contas fixas e parcelas**.
- Tocar num mês mostra o total, a divisão, quanto sobra do limite e o acumulado até ali.

### 3.10 Importação de fatura e extrato

Acesso: Cartões › Importar fatura, Contas › Importar extrato, ou o link no fim de Lançamentos. Também por **"Abrir com o Kash"** no app do banco ou no e-mail (iOS e Android).

- **Formatos:** PDF da fatura (lido com IA), PDF de extrato, OFX e CSV (lidos no aparelho).
- **PDF com senha:** o app detecta e pede a senha; o PDF é aberto no próprio celular e só o texto, sem dados pessoais, vai para a IA. Depois de 3 senhas erradas, mostra alternativas.
- **Revisão antes de entrar:** "Só parceladas" ou "Tudo" (fatura do mês ou do mês passado), nome editável (o original do banco fica guardado), categoria por lançamento, "categoria das marcadas" de uma vez, aviso de possível duplicado e **desfazer a importação**.
- **Conferência com o que já está no Kash:** lado a lado ("Já estão no Kash": manter, corrigir com o arquivo ou importar também), "É o mesmo" para os parecidos e o que está no Kash mas não veio no arquivo. No extrato, confere também pagamento de fatura e contas fixas.
- **Transferências no extrato** ("aplicação poupança", Pix para si mesmo) viram transferência para a outra conta, sem duplicar.
- **Regras aprendidas:** nomes trocados viram regra para as próximas importações; colunas de CSV desconhecido ficam lembradas por banco.
- **Sugestão de nomes com IA** em OFX/CSV (opcional): só as descrições que o Kash ainda não conhece, sem dados pessoais; aparecem com o selo "IA".

### 3.11 Assistente Kash (IA) *(1.2.0)*

- **Balão no Início** (e widget, Atalhos, Siri) abre um chat com o **Claude** sobre as finanças da pessoa.
- Perguntas como "Vale a pena comprar um celular de R$ 2.000 em 10x?", "Onde eu posso economizar?", "Quanto posso gastar por dia até o fim do mês?", "Consigo bater minhas metas no prazo?" (sugestões prontas na tela vazia).
- Responde com os números dela: saldos, cartões e faturas, gastos do mês e por categoria, limite, parcelas e contas fixas dos próximos meses, metas e lançamentos dos últimos 60 dias. Termina compras com "sim", "não" ou "sim, se…".
- **Lançamento assistido:** "gastei 45 no iFood no Nubank", "300 num fone em 3x", "recebi o salário ontem" viram **cartões de confirmação** (até 5 por mensagem). **Lançar** cria; **Editar** abre o sheet já preenchido; **Descartar** ignora. Nada é salvo sem a pessoa tocar.
- **Foto do comprovante** *(1.3.0)*: botão de câmera no chat, ou o botão de leitura ao lado da descrição no lançamento (abre o assistente direto na câmera ou galeria). Serve para nota fiscal, cupom, recibo e comprovante de Pix ou de cartão. O Claude lê o total pago, o estabelecimento, a data, a categoria e o cartão/conta (quando o comprovante mostra) e devolve o mesmo cartão de confirmação. Dá para acrescentar texto ("foi no Nubank em 3x"). A foto é reduzida no aparelho (no máximo 1568 px, JPEG 70%) e não é guardada: nem no aparelho, nem no servidor.
- Pede **autorização na primeira vez**; a conversa fica **só no aparelho** ("Nova conversa" apaga). **40 perguntas por dia**.
- Detalhes técnicos na seção 6.

### 3.12 Widget e atalhos do iPhone *(1.2.0)*

- **Tela inicial, pequeno:** abre o assistente.
- **Tela inicial, médio:** botões "Perguntar" e "Lançar gasto".
- **Tela bloqueada:** redondo e retangular, abrem o assistente.
- O widget **não mostra valores**; só abre o app (`com.andreloureiro.kash://assistant` e `…://lancar?tipo=gasto`). iOS 17+.
- Ação **"Perguntar ao Kash"** em Atalhos, Siri, Spotlight, botão de Ação e Toque Atrás.

### 3.13 Perfil

- **Dados pessoais** (nome, celular) e **Segurança** (alterar senha, Face ID).
- **Limite mensal**, inteiro ou **dividido** entre cartão e restante (débito, Pix, dinheiro); pagar a fatura pela conta não conta no restante.
- **Categorias**: criar, renomear, trocar a cor, reordenar e excluir (excluir uma em uso pede para onde mover os registros). Todo usuário começa com Comida, Transporte, Lazer, Mercado, Assinaturas e Outros; "Entrada", "Fatura" e "Transferência" são reservadas.
- **Tema** escuro (padrão) ou claro, sincronizado com a web.
- **Lembretes:**
  - **notificação** no celular 2 dias antes do vencimento de contas e faturas, às 9h, mais depósito das metas e "faturas fecharam" no dia 1º;
  - **e-mail** opcional às 9h com o que vence em 2 dias e os depósitos do dia.
- **Alertas de gastos** *(1.3.0)*, notificação na hora, cada aviso uma vez só, no máximo um por vez:
  - **80%** e **100%** do limite do mês, e do cartão/restante quando o limite é dividido; mostra o quanto sobra por dia;
  - **ritmo**: entre o dia 8 e 3 dias antes do fim do mês, se a projeção passar 5% do limite (antes dos 80%), uma vez por semana;
  - **categoria acima do normal**: últimos 7 dias ≥ 50% e ≥ R$ 50 acima da média semanal das 4 semanas anteriores, com gasto em pelo menos 2 delas.
- **Resumo da semana** *(1.3.0)*: domingo às 19h, com o total da semana, a maior categoria e o que sobra no limite do mês. Reagendado sempre que os lançamentos mudam no app.
- Alertas e resumo são calculados **no aparelho** (`spendingAlerts`, `weeklySummaryReminder` em `@kash/domain`), sem servidor, e ligados por padrão (Perfil › Preferências, preferência do aparelho). Limite conhecido: o resumo usa os números da última vez que o app foi aberto na semana; o que for lançado só pela web depois disso não entra.
- **Compartilhar dados de uso** (liga/desliga Firebase Analytics, Crashlytics e Performance).
- **Moeda** (só Real por enquanto; outras aparecem como "em breve").
- **Ajuda** (perguntas frequentes, inclusive como configurar o Toque Atrás e o widget), **Termos** e **Privacidade**.
- **Exportar meus dados** (JSON versionado `kash-export/1`, pela folha de compartilhamento).
- **Zerar meus dados**: recomeça do zero sem criar outra conta (apaga contas, cartões, faturas, lançamentos, parcelados, contas fixas, metas, importações e nomes aprendidos; mantém login, nome, celular, tema e lembretes). Confirmação digitando ZERAR, com atalho para exportar antes.
- **Sair** e **Excluir conta** (apaga tudo em cascata).
- Versão do app exibida.

### 3.14 Sincronização e funcionamento offline

- **Tempo real:** o que é lançado na web ou em outro celular aparece na hora; ao voltar do segundo plano, o app se atualiza.
- **Abre sem rede** com os últimos dados (cache persistida).
- **Escritas otimistas:** a mudança aparece na hora; se o servidor recusar, vira aviso e volta ao estado do servidor.

## 4. Kash web e site

### 4.1 Kash web (`/entrar` e `/app`)

O app completo no navegador, mesma conta e mesmas regras:

| Rota | Tela |
|---|---|
| `/entrar`, `/criar-conta`, `/esqueci-senha` | login (inclusive Apple e Google), cadastro e recuperação por código |
| `/app/boas-vindas` | primeiro acesso em 3 passos |
| `/app` | Início com Primeiros passos, saldo, gastos × limite, mini-previsão, lançamentos, próximas contas e metas |
| `/app/lancamentos` | lista por mês com busca e filtros |
| `/app/cartoes` | cartões, fatura e pagar fatura, parcelas, recorrentes |
| `/app/contas`, `/app/contas-fixas` | contas (com Transferir) e contas fixas |
| `/app/metas` | metas e depósitos |
| `/app/relatorio`, `/app/relatorio/<categoria>`, `/app/previsao` | relatório de 6 meses, categoria e previsão |
| `/app/importar` | importação de fatura e extrato |
| `/app/perfil/*` | dados, segurança, limite, categorias, moeda, ajuda, termos, privacidade, exportar, zerar, sair, excluir conta |

**Ainda só no app:** relatório por dia/semana, Assistente Kash e lançamento assistido, widget e atalhos, Face ID, notificações push. O cálculo dos relatórios e do resumo do assistente fica no `@kash/domain` e pode ser reaproveitado na web.

### 4.2 Site institucional

- **Landing** (`/`): proposta, recursos, privacidade, perguntas frequentes e botões das lojas (controlados em `apps/web/src/content/site.ts`).
- **Política de privacidade** (`/privacidade`), atualizada em 26/11/2026 com o assistente e a foto do comprovante.
- **Excluir conta** (`/excluir-conta`), exigido pelas lojas.
- Métricas sem cookies: Vercel Web Analytics e Speed Insights.

## 5. Regras de negócio importantes

Todas são funções puras em `packages/domain`, compartilhadas por app e web.

- **O que conta como gasto:** saídas, **sem** pagamento de fatura (a compra já contou ao entrar no cartão) e **sem** transferências entre contas. Entradas também ignoram transferências.
- **Fatura atual** = compras do cartão no mês corrente.
- **Virada de mês** (`ensure_rollover`, ao abrir o app, ao voltar do segundo plano e diariamente pelo `pg_cron`): fecha a fatura do mês anterior de cada cartão, volta as contas fixas para "a pagar" e lança a próxima parcela de cada parcelamento.
- **Parcelamento antigo:** o mês informado é o da fatura em que a 1ª parcela veio; as anteriores contam como pagas e não viram lançamento.
- **Excluir parcelamento** marca como excluído (o "Desfazer" restaura com o mesmo contador); excluir só uma parcela não mexe na numeração.
- **Limite dividido:** cartão = fatura do mês de todos os cartões; restante = saídas das contas sem pagamento de fatura e sem transferências.
- **Fuso único** America/Sao_Paulo para "hoje" e para a virada.
- **Dinheiro** formatado por `formatBRL` (sem `Intl`), agregados arredondados a 2 casas.

## 6. Inteligência artificial (Claude)

Três usos, todos pela API da Anthropic, com a chave **só no servidor** (`ANTHROPIC_API_KEY` nos segredos do Supabase):

| Uso | Edge Function | Modelo padrão (troca por segredo) | Limite por pessoa / 24 h |
|---|---|---|---|
| Ler PDF de fatura/extrato | `import-assist` | `claude-sonnet-5-5` (`IMPORT_AI_MODEL`) | 30, somado com o item abaixo |
| Sugerir nomes em OFX/CSV | `import-assist` | `claude-haiku-5-5` (`IMPORT_AI_NAMES_MODEL`) | (mesmo limite) |
| Assistente e lançamento assistido | `assistant` | `claude-opus-5-5` (`ASSISTANT_AI_MODEL`, esforço `ASSISTANT_AI_EFFORT`) | 40, separado |

**Assistente, como funciona:**
- O app monta no aparelho um **resumo financeiro** (`buildAssistantContext`) e manda com as mensagens mais recentes (até 20).
- A função confere a sessão, os tamanhos e o limite, chama o Claude (SDK oficial `@anthropic-ai/sdk` 1.13.0) e registra os tokens em `ai_calls`. **Nada da conversa fica no servidor.**
- **Cache de prompt** nas regras, no resumo e no histórico (barateia as perguntas seguintes da conversa).
- **Fallback em recusa** (`fallbacks: "default"`): se o modelo recusar por política, o servidor da Anthropic tenta outro modelo na mesma chamada.
- **Lançamento assistido:** ferramenta `propor_lancamento` com **esquema estrito**, cujas opções são só as categorias e as contas/cartões da pessoa. Servidor e app conferem cada proposta de novo; resposta cortada por tamanho descarta as propostas.
- **Foto:** vai em base64 só na última mensagem (bloco `image` antes do texto). A função aceita JPEG, PNG ou WebP de até 2 MB em base64 (`image_too_large` / `image_invalid`). Regras do prompt para foto: usar o total pago, o nome fantasia, a data do comprovante (nunca futura), não repetir CPF/endereço/cartão e não chutar se estiver ilegível. Conta no mesmo limite de 40 por dia.
- **Regras do prompt:** não inventar valores, perguntar o que faltar, só finanças pessoais e uso do Kash, nunca pedir senha/CPF/dados bancários, ignorar instruções vindas dos dados, lembrar que não substitui um profissional.

**Custo:** acompanhar em `ai_calls` (`select date(created_at), purpose, count(*), sum(input_tokens), sum(output_tokens) from ai_calls group by 1, 2 order by 1 desc;`). Opus 5.5 custa US$ 4 de entrada e US$ 20 de saída por milhão de tokens; Sonnet 5.5 sai pela metade; Haiku 5.5 bem mais barato.

## 7. Privacidade e segurança

- **RLS em todas as tabelas** (cada pessoa só vê os próprios dados).
- **Sessão criptografada** no aparelho (SecureStore) e bloqueio por biometria opcional.
- **Para a IA nunca vão** e-mail, celular, sobrenome, CPF, endereço nem número de cartão, com uma exceção: a **foto de comprovante** que a pessoa escolhe mandar vai inteira e pode ter dados impressos (como o CPF na nota). A tela de autorização e a política avisam; o prompt manda não repetir esses dados, e a foto não é guardada. No PDF, o app remove dados pessoais antes do envio; o arquivo e a senha não saem do aparelho. No assistente, há autorização explícita na primeira vez e a conversa fica só no aparelho. A Anthropic não usa esses dados para treinar modelos.
- **Telemetria** (Firebase) sem valores, nomes de lançamentos ou e-mail, só um id interno; sem identificador de anúncios; desligável no Perfil.
- **Direitos do titular:** exportar os dados, zerar os dados e excluir a conta pelo app, pela web ou pelo site.
- **Política de privacidade** no app (`/privacy`) e no site, com seções de Importação com IA e Assistente com IA.

## 8. Arquitetura técnica

**Monorepo** pnpm + Turborepo:

```
apps/mobile/              app Expo (SDK 57, React Native 0.86, Expo Router)
  app/                    rotas: (auth) e (app)
  src/design-system/      tokens, tema e componentes (sem regra de negócio)
  src/features/<área>/    telas: home, transactions, cards, accounts, goals, report, forecast,
                          import, assistant, quickAdd, profile, auth, onboarding, security…
  src/store/              Zustand (estado + ações) e hooks derivados
  src/data/               TanStack Query, sincronização e escritas otimistas
  src/services/           Supabase, notificações, telemetria, biometria
  plugins/                config plugins (App Intents do Toque Atrás e do assistente)
  targets/widget/         widget iOS (SwiftUI, via @bacons/apple-targets)
  e2e/                    fluxos Maestro
apps/web/                 Next.js 16: site + Kash web
packages/domain/          @kash/domain: regras puras (Vitest)
packages/supabase-client/ @kash/supabase-client: cliente tipado, repositórios, RPCs
packages/importers/       @kash/importers: leitura de OFX, CSV e regras de importação
packages/config/          tsconfig base
supabase/                 migrações, seed, pgTAP, Edge Functions, templates de e-mail
docs/                     este documento, release, plano de integração, screenshots
```

**Princípios:**
- Dependências num sentido só: rotas → telas → store/data → design system; store/data → `@kash/supabase-client` → `@kash/domain`.
- **Servidor é a verdade, store é a cache.** Um snapshot carrega tudo e hidrata o Zustand.
- **Sheets globais** controlados pelo store (lançamento, transferência, cartão, conta, meta etc.).
- **Relógio injetável** (`src/lib/clock.ts`) para testar datas.
- **Design system:** cores, tipografia (Sora), espaços, raios e sombras só por tokens; temas escuro e claro; alvos de toque ≥ 44 px; todo elemento interativo com `testID` e acessibilidade.
- `ios/` e `android/` são gerados pelo `expo prebuild` e não se editam à mão.

**Principais bibliotecas:** Zustand, TanStack Query, Reanimated 4, react-native-svg, Lucide, expo-local-authentication, expo-notifications, expo-document-picker, react-native-webview (pdf.js), expo-apple-authentication, expo-web-browser, React Native Firebase 27, @bacons/apple-targets.

## 9. Backend (Supabase)

- **Tabelas:** `profiles`, `accounts`, `cards`, `transactions`, `plans` (parcelamentos), `invoices` (faturas), `bills` (contas fixas), `goals`, `categories`, `imports`, `merchant_rules` (nomes aprendidos), `reminder_emails`, `ai_calls`.
- **Saldos como views** (saldo da conta = abertura + lançamentos).
- **RPCs** (escritas de várias linhas numa transação): `add_installment_purchase`, `create_transfer`, `update_transfer`, `pay_bill`, `unpay_bill`, `pay_invoice`, `record_goal_deposit`, `soft_delete_transaction`, `undo_delete_transaction`, `delete_card`, `delete_account`, `move_plan_to_card`, `update_category`, `delete_category`, `set_category_position`, `import_card_statement`, `import_account_statement`, `undo_import`, `ensure_rollover`, `export_my_data`, `reset_my_data`.
- **Edge Functions (Deno):** `delete-account`, `send-reminders` (e-mail via Resend, cron às 9h de Brasília), `import-assist` (IA da importação), `assistant` (assistente). Código compartilhado em `_shared`.
- **Agendamentos (`pg_cron`):** virada de mês diária (`kash-rollover-daily`, 03:05 UTC) e lembretes por e-mail (`kash-email-reminders`).
- **Realtime** para sincronizar app e web.
- **Seed local** com a usuária de demonstração Lara (`lara@email.com` / `123456`), usada nos E2E.
- **16 migrações**, de `20261006000000_init` a `20261021000000_reset_my_data`. A CI aplica em produção a cada push na `main` que mude `supabase/**`.

## 10. Testes e qualidade

| Camada | Ferramenta | Onde | Situação (25/11) |
|---|---|---|---|
| Regras de negócio | Vitest | `packages/domain` | 114 testes |
| Importadores | Vitest | `packages/importers` | 45 testes |
| App (telas, store, sincronização) | Jest + Testing Library | `apps/mobile/src` | 207 testes |
| Web (conteúdo e dados) | Vitest | `apps/web/tests/unit` | 37 testes |
| Edge Functions | `deno test` | `supabase/functions` | 36 testes |
| Banco (RLS, RPCs, virada) | pgTAP | `supabase/tests` | com Supabase local |
| Cliente contra o banco real | Vitest | `packages/supabase-client/tests` | com Supabase local |
| Ponta a ponta no app | Maestro | `apps/mobile/e2e/flows` | 18+ fluxos |
| Ponta a ponta na web | Playwright + axe (celular e desktop) | `apps/web/tests/e2e` | com Supabase local |

Antes de concluir qualquer mudança: `pnpm typecheck && pnpm lint && pnpm test` (e `pnpm test:backend` se mexeu no banco). Telemetria de produção pelo Firebase (Analytics, Crashlytics, Performance).

## 11. Publicação e versões

**Histórico:**
- **1.0.0:** lançamentos, cartões e parcelas (inclusive antigas), contas, contas fixas, metas, relatório, previsão, categorias, cores, lembretes, exportar e excluir conta.
- **1.0.1:** Face ID e previsão com seleção de mês.
- **1.1.0** (iOS build 12, Android versionCode 5): primeiros passos guiados, transferências, tempo real, lembrete por e-mail, relatório com meses reais, importação de fatura e extrato, limite dividido, gastos por categoria, login Apple/Google, Firebase, Zerar dados (Android), Toque Atrás.
- **1.2.0** (iOS build 14, aprovada na App Store): relatório por dia/semana/mês, atalhos no Início, esqueleto de carregamento, Assistente Kash com lançamento assistido, widget e "Perguntar ao Kash", Zerar dados no iPhone.
- **1.3.0 (em preparação, sai junto nas duas lojas):** lançamento mais rápido (teclado do celular, calendário, categoria sugerida, troca de tipo na transferência), foto do comprovante, alertas de gastos e resumo da semana, assinaturas detectadas, app em português no iPhone.

**Como publicar** (passo a passo em [`docs/release.md`](release.md)):
1. **Backend primeiro:** `pnpm deploy:backend` (migrações, Edge Functions e config de auth).
2. **Builds:** `cd apps/mobile && eas build -p all --profile production` (número do build sobe sozinho).
3. **Envio:** `eas submit -p ios --latest` e `eas submit -p android --latest` (Android na faixa interna).
4. **Lojas:** colar os textos de `docs/loja-<versão>.md` (Novidades, notas da revisão, privacidade).
5. Depois de publicado: renomear a seção do CHANGELOG e abrir a próxima.

**Regras:**
- Mudou algo nativo (dependência, plugin, Swift, versão)? **Build novo.** Só JavaScript? `eas update --branch production`.
- `runtimeVersion` = versão do app: um update nunca cai num binário incompatível. Com o `app.json` em 1.3.0, nenhum update alcança quem está na 1.2.0.
- As melhorias acumulam em "Próxima versão" e vão juntas para as lojas.
- Depois que a Apple aprova uma versão, ela não aceita mais builds com o mesmo número ("Invalid Pre-Release Train"): suba a versão no `app.json` antes do próximo build.

## 12. Contas, serviços e identificadores

| Serviço | Uso | Referência |
|---|---|---|
| Apple Developer | App Store, TestFlight, Sign in with Apple | time `G58V8BP6VH`, app `6820170870` |
| Google Play Console | Android | `com.andreloureiro.kash` |
| Expo / EAS | builds, envio e updates | projeto `@loureiro_12/kash` |
| Supabase | banco, auth, funções | ref `sqpxugyjnlwpkzuxzcpg` |
| Anthropic | Claude (importação e assistente) | `ANTHROPIC_API_KEY` (e `ANTHROPIC_WORKSPACE_ID` se a chave for de organização) |
| Resend | e-mails de lembrete (e SMTP) | `RESEND_API_KEY`, remetente `mail.kash.app.br` |
| Firebase | Analytics, Crashlytics, Performance | arquivos de config no EAS |
| Google Cloud | login com Google | OAuth client |
| Vercel | hospedagem do site e do Kash web, métricas | www.kash.app.br |
| GitHub | código e CI | `Loureiro12/kash` |

Esquemas de link do app: `kash://` e `com.andreloureiro.kash://` (ex.: `://assistant`, `://lancar?tipo=gasto`).

## 13. Pendências e riscos conhecidos

**Antes de lançar a 1.3.0**
- **Foto do comprovante não testada contra a API real:** a leitura de verdade só acontece no TestFlight. Testar notas, cupons e comprovantes de Pix reais.
- **Ver no aparelho:** alertas (com a permissão de notificações), assinaturas detectadas e o novo modal de lançamento.
- **Backend:** já publicado em 26/11 (migração `20261022000000_bill_from_recurring` e função `assistant` com foto).

**Exigências e configurações em aberto**
- **Revogar o token da Apple ao excluir a conta** (exigência da Apple para quem oferece Sign in with Apple).
- **Nome definitivo na App Store:** o registro ficou como "Kash (a67172)" porque "Kash" já existe.
- **SMTP próprio** no Supabase para e-mails de autenticação em volume (o padrão limita poucos por hora).
- **Envio Android automatizado** precisa de uma service account do Google Play.
- **Região do Supabase** em `ca-central-1` (Canadá): latência maior para o Brasil; só muda recriando o projeto.

**Ambiente de desenvolvimento**
- O Mac está quase sem disco (o Docker ocupa ~46 GB). Isso trava builds e o Maestro. Liberar com `docker system prune -a --volumes` (com o Supabase parado) e apagar `~/Library/Developer/Xcode/DerivedData`.

**Ideias levantadas e não feitas**
- Relatórios por período e assistente na web.
- Widget com valores (gasto do dia, quanto sobra), que exigiria App Group para compartilhar dados com o widget.

## 14. Como rodar o projeto

**Pré-requisitos:** Node 20+, pnpm 10, Xcode e/ou Android Studio, Docker Desktop, Supabase CLI, Maestro (para E2E).

```bash
pnpm install
pnpm db:start                                  # Supabase local (Docker)
cp apps/mobile/.env.example apps/mobile/.env   # preencher com `supabase status -o env`
pnpm ios                                       # dev build no simulador (não roda no Expo Go)
pnpm dev                                       # depois do 1º build, só o Metro
pnpm dev:web                                   # site e Kash web em http://localhost:3000
```

Login de demonstração: `lara@email.com` / `123456`.

| Comando | O que faz |
|---|---|
| `pnpm typecheck` · `pnpm lint` · `pnpm test` | checagens e testes unitários |
| `pnpm test:backend` · `pnpm test:all` | pgTAP + integração / tudo |
| `pnpm e2e:ios` · `pnpm e2e:web` | Maestro / Playwright |
| `pnpm db:reset` · `pnpm db:types` | recria o banco local / regenera os tipos |
| `pnpm deploy:backend` | publica migrações, funções e config de auth em produção |
| `pnpm dev:prod` | Metro apontando para a produção |

Variáveis do app (`apps/mobile/.env`): `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_DATA_SOURCE` (`seed` para rodar sem backend) e `EXPO_PUBLIC_LOG_REQUESTS`.
