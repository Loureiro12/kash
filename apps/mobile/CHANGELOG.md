# Kash (app) — histórico de versões

As melhorias do app ficam acumuladas em **Próxima versão** e vão juntas para as lojas num build novo.
Com `runtimeVersion = appVersion`, um `eas update` só alcança binários da mesma versão do `app.json`:
com o `app.json` em 1.2.0, nenhum update chega a quem está na 1.1.0 por engano.
Checklist de lançamento em `docs/release.md` › 5.2.

## Próxima versão — 1.2.0 (em preparação, vai junto para as duas lojas)

Base: iOS 1.1.0 build 12 (commit `cb22f16`) e Android 1.1.0 versionCode 5 (commit `10a19eb`).

- **Relatório por dia, semana e mês** (Início › "Hoje" e "Esta semana", ou o card Gastos do mês): quanto saiu e entrou no período, comparação com o anterior (no período atual, até o mesmo ponto: "a semana passada até quarta"), ritmo contra o limite (o mensal proporcional: dia = mês ÷ dias, semana = 7 dias; no mês atual, "no ritmo atual você fecha o mês em…"), média dos períodos anteriores, dia de maior gasto, por categoria e maiores gastos. Gráfico com os dias (toque numa barra abre o dia) e navegação para períodos anteriores. A semana começa na segunda.
- **Carregamento sem dados de exemplo**: ao abrir o app (e logo depois do login), o Início mostra um esqueleto no formato da tela até seus dados chegarem, em vez de valores de exemplo por um instante. Lançamentos, Relatório, Previsão e Categoria também esperam os dados, e o lançamento pelo Toque Atrás só abre depois deles.
- **Zerar meus dados** chega ao iPhone (no Android já foi na 1.1.0).
- **Assistente Kash (IA)**: balão no canto do Início abre um chat com o Claude (Anthropic) para perguntar sobre as próprias finanças ("vale a pena comprar um celular em 10x?", "onde economizo?", "quanto posso gastar por dia?"). Responde com os números da pessoa: saldos, cartões e faturas, gastos do mês e por categoria, limite, parcelas e contas fixas dos próximos meses, metas e os lançamentos dos últimos 60 dias. Pede autorização na primeira vez; não envia e-mail, celular, sobrenome nem número de cartão; a conversa fica só no aparelho ("Nova conversa" apaga). **Lançamento assistido**: "gastei 45 no iFood no Nubank", "300 num fone em 3x", "recebi o salário ontem" viram cartões de confirmação (até 5 por mensagem) com valor, descrição, categoria, conta/cartão, data e parcelas; nada é salvo sem tocar em **Lançar** (Editar abre o sheet de lançamento já preenchido; Descartar ignora). O assistente só pode escolher entre as categorias e as contas/cartões da pessoa (ferramenta com esquema estrito), e o app confere de novo antes de lançar. 40 perguntas por dia. Backend: Edge Function `assistant` (mesma `ANTHROPIC_API_KEY` da importação; `docs/release.md` › 9.1). Política de privacidade atualizada (app e site).

### Texto de "Novidades" para as lojas

> Novidades desta versão:
> • Relatórios do dia, da semana e do mês: veja quanto gastou, com o quê, compare com o período anterior e saiba se está no ritmo do seu limite.
> • Atalhos "Hoje" e "Esta semana" no Início.
> • Assistente Kash: pergunte se vale a pena fazer uma compra, onde dá pra economizar ou como estão seus gastos, e receba uma resposta com os seus números. Também dá pra lançar escrevendo: “gastei 45 no iFood” — é só conferir e tocar em Lançar.
> • Abertura mais limpa: enquanto seus dados carregam, você vê um esqueleto da tela em vez de números provisórios.
> • Zerar meus dados: recomece do zero sem criar outra conta (Perfil).
> • Pequenas correções.

## 1.1.0 — iOS build 12 (App Store) · Android versionCode 5

Base: builds 1.0.1 (iOS 6, Android 3), feitos no commit `9ea8010`.

- **Primeiro acesso guiado**: quem cria a conta passa por boas-vindas em 3 passos (contas com o saldo de hoje, cartão opcional, limite mensal) e encontra no Início o card **Primeiros passos** (conta, 1º gasto, cartão, conta fixa, meta), que marca sozinho e pode ser escondido (volta pelo Perfil). Mesmo estado da web: quem concluiu num lugar não vê de novo no outro.
- **Transferência entre contas** (Contas › Transferir, ou a opção "Transferência" em Lançar gasto): move o dinheiro de uma conta para outra sem contar como gasto nem entrada; aparece numa linha só ("Corrente → Poupança"), tem filtro em Lançamentos e pode ser editada ou excluída (com desfazer).
- **Sincronização em tempo real**: o que você lança ou muda no Kash web (ou em outro celular) aparece no app na hora, sem precisar puxar a tela. Ao voltar do segundo plano, o app se atualiza sozinho.
- **Lembrete por e-mail** no Perfil › Preferências: opt-in, e-mail às 9h com contas e faturas que vencem em 2 dias e os depósitos de metas do dia. Independente da notificação push e sincronizado com o Kash web. Precisa do backend publicado (migração `20261012000000_email_reminders` + função `send-reminders`).
- **Relatório com os meses reais**: o gráfico de 6 meses e a comparação com o mês anterior usam os lançamentos de verdade (antes os 5 meses anteriores eram valores de exemplo). Sem gastos no mês anterior, mostra "Sem gastos em <mês> pra comparar".
- **Importar fatura e extrato** (Cartões › Importar fatura, Contas › Importar extrato ou o link no fim de Lançamentos): PDF da fatura, OFX ou CSV, com revisão antes de entrar: "Só parceladas" ou "Tudo" (fatura do mês ou do mês passado), nome editável (o original do banco fica guardado), categoria por lançamento, aviso de possível duplicado e desfazer. Os nomes trocados viram regra para as próximas importações. Mesmo backend da web (migração `20261016000000_imports` + função `import-assist`).
  - **PDF com senha**: o app detecta ao escolher o arquivo e pede a senha; o PDF é aberto no próprio celular (pdf.js num WebView invisível) e só o texto, sem CPF, endereço, número do cartão e nome, vai para a IA, com autorização. Depois de 3 senhas erradas, mostra as alternativas (baixar de novo ou OFX/CSV).
  - **Transferências no extrato**: "aplicação poupança", "mesma titularidade" ou Pix para o próprio nome entram como transferência para a outra conta (não contam como gasto nem entrada); se o outro lado já está no Kash, ele vira a outra perna, sem duplicar. Na revisão, qualquer linha pode virar "⇄ Para/De <conta>".
  - **Sugerir nomes com IA em OFX/CSV** (opcional, mesma autorização do PDF): só os nomes de compras que o Kash ainda não conhece vão para a IA, sem dados pessoais; as sugestões aparecem com o selo "IA" para conferir e, importadas, viram regra (a mesma loja não volta para a IA).
  - **Compras do mês com conferência**: no modo "Tudo" (e no extrato), o que você já lançou não entra em dobro. A revisão mostra lado a lado o que está no arquivo e no Kash ("Já estão no Kash": manter o seu, corrigir com o arquivo ou importar também), avisa o que é só parecido ("É o mesmo") e lista o que está no Kash mas não veio no arquivo. No extrato da conta, o pagamento de fatura e as contas fixas pagas pelo Kash também são conferidos, e o extrato pode vir em PDF (a IA lê com a regra de sinal do extrato: saída positiva, entrada negativa).
  - **Categoria das marcadas** muda as saídas de uma seção de uma vez, e as colunas de um CSV desconhecido ficam lembradas para o próximo arquivo do mesmo banco.
  - **Abrir com o Kash**: no app do banco ou no e-mail, "Compartilhar/Abrir em…" › Kash abre a importação com o arquivo já escolhido (PDF, OFX e CSV; iOS e Android).
  - Novas dependências nativas (`expo-document-picker`, `react-native-webview`) e tipos de documento no `app.json`: exige build novo, não vai por OTA.
  - Privacidade no app ganhou a seção "Importação com IA (opcional)".
- **Limite mensal dividido** (Perfil › Limite mensal › "Separar cartão e o restante"): uma meta para a fatura do mês dos cartões e outra para débito, Pix e dinheiro; o total é a soma. O Início mostra as duas barras. Pagar a fatura pela conta não conta no restante (a compra já está no cartão). Mesma configuração da web (migração `20261018000000_card_budget`). A tela do limite ficou sem a barra de abas, para o teclado caber inteiro.
- **Gastos por categoria** (Relatório › toque numa categoria): no estilo da Previsão, barras dos últimos 6 meses (toque escolhe o mês), total com a comparação com o mês anterior, quanto a categoria pesa nos gastos do mês, média por lançamento, "Onde você mais gastou" e os lançamentos do mês (toque edita). Chips no topo trocam de categoria. Também na web (`/app/relatorio/<categoria>`).
- **Entrar com Apple e Google** (login e cadastro): no iPhone, "Continuar com Apple" usa a folha nativa; o Google (e a Apple no Android) abre o login do provedor numa janela segura do sistema e volta para o app. Mesmo login na web. Quem entra só por Apple/Google vê em Segurança "Você entra com …" no lugar de "Alterar senha". Novos módulos nativos (`expo-apple-authentication`, `expo-web-browser`) e a capacidade Sign In with Apple: exige build novo. Configuração na Apple, no Google e no Supabase: `docs/release.md` › 1.10 (migração `20261019000000_social_login`).
  - **Falta antes da loja:** revogar o token da Apple ao excluir a conta (exigência da Apple para quem oferece Sign in with Apple).
- **Firebase Analytics, Crashlytics e Performance**: eventos de uso (sem valores, nomes ou e-mail; a pessoa só pelo id interno), telas vistas, relatórios de falha (inclusive erros de tela, com "Tentar de novo") e desempenho (abertura do app, carregamento dos dados, leitura de PDF e cada chamada ao servidor). Sem identificador de anúncios (não pede rastreamento à Apple). Perfil › **Compartilhar dados de uso** desliga as três coletas. Exige build novo (React Native Firebase 27, frameworks dinâmicos no iOS) e os arquivos do Firebase no EAS (`docs/release.md` › 1.11).
- **Zerar meus dados** (Perfil, também na web; no Android 1.1.0, no iPhone só na 1.2.0): recomeça do zero sem criar outra conta. Apaga contas, cartões, faturas, lançamentos, parcelados, contas fixas, metas, importações e nomes aprendidos; categorias e limite mensal voltam ao padrão e as boas-vindas aparecem de novo. Mantém login, nome, celular, tema e lembretes. Confirmação digitando ZERAR, com atalho para exportar os dados antes. Migração `20261021000000_reset_my_data` (backend antes do app).
- **Lançar pelo Toque Atrás do iPhone** (e Siri, app Atalhos, Spotlight, botão de Ação): ações "Lançar gasto" e "Lançar entrada" do Kash (App Intents) abrem o app direto no lançamento, já no tipo certo; com Face ID ligado, pede o desbloqueio antes. Como configurar está em Perfil › Ajuda. Também pelo link `com.andreloureiro.kash://lancar?tipo=gasto|entrada` (atalho "Abrir URL", automações). Código Swift novo (`plugins/quick-add/KashQuickAdd.swift`): exige build novo.
- O texto do lembrete push passou a "Notificação 2 dias antes do vencimento", para diferenciar do e-mail.
- **Correção:** Perfil e Ajuda mostravam "1.0.0" fixo; agora mostram a versão real do app.

### Texto de "Novidades" para as lojas

> Novidades desta versão:
> • Começo guiado: em 3 passos o Kash fica pronto pra usar, com um checklist dos primeiros passos.
> • Transferência entre contas: passe dinheiro da corrente pra poupança sem bagunçar seus gastos.
> • Tempo real: o que você lança no computador aparece no celular na hora (e vice-versa).
> • Lembrete por e-mail: ligue em Perfil › Preferências e receba às 9h as contas e faturas que vencem em 2 dias.
> • Importe a fatura do cartão (PDF, mesmo com senha) ou o extrato da conta (OFX/CSV): revise, renomeie e traga as parcelas em aberto sem digitar nada.
> • Limite separado para o cartão e para o resto (débito, Pix, dinheiro), sem contar o pagamento da fatura duas vezes.
> • Gastos por categoria: veja mês a mês quanto foi para cada categoria e onde você mais gastou.
> • Entre com Apple ou Google, sem precisar de mais uma senha.
> • Relatório mais fiel: o gráfico dos últimos meses agora usa os seus lançamentos de verdade.
> • Use o Kash também no computador: www.kash.app.br (mesma conta, mesmos dados).
> • Pequenas correções.

## 1.0.1

- Desbloqueio com Face ID / Touch ID / digital (módulo nativo → build novo).
- Previsão: tocar num mês recalcula total, divisão, limite e acumulado (build iOS 6 / Android 3).

## 1.0.0

- Primeira versão: lançamentos, cartões e parcelas (inclusive compras antigas), contas, contas fixas, metas, relatório, previsão, categorias, cores personalizadas, lembretes push, exportar dados e excluir conta.
