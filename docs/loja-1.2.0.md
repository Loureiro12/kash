# Kash 1.2.0 — textos e checklist das lojas

Textos prontos para colar na App Store Connect e na Google Play Console. Os limites de cada campo estão entre parênteses e já foram conferidos.
O que mudou nesta versão está em [`apps/mobile/CHANGELOG.md`](../apps/mobile/CHANGELOG.md); o passo a passo técnico em [`docs/release.md`](release.md) › 5.2.

---

## App Store (iOS)

### Novidades desta versão (até 4.000)

```
Novidades desta versão:

• Assistente Kash: pergunte se vale a pena fazer uma compra, onde dá pra economizar ou quanto ainda pode gastar no mês. Ele responde com os seus números de verdade.
• Lance gastos escrevendo: "gastei 45 no iFood no Nubank" vira um lançamento pronto. É só conferir e tocar em Lançar.
• Relatórios do dia, da semana e do mês: quanto saiu, com o quê, comparado com o período anterior e com o ritmo do seu limite.
• Atalhos "Hoje" e "Esta semana" no Início.
• Widget na tela inicial e na tela bloqueada: abra o assistente ou lance um gasto com um toque.
• "Perguntar ao Kash" na Siri, no app Atalhos e no botão de Ação.
• Zerar meus dados: recomece do zero sem criar outra conta (Perfil).
• Abertura mais limpa enquanto seus dados carregam.
• Correções e melhorias.
```

### Texto promocional (até 170)

Pode ser trocado a qualquer momento, sem nova revisão.

```
Novo: o Assistente Kash responde se vale a pena comprar, onde economizar e lança gastos que você escreve. Tudo com os seus números.
```

### Subtítulo (até 30)

```
Gastos, cartões e metas
```

### Palavras-chave (até 100, separadas por vírgula, sem espaço)

```
finanças,gastos,orçamento,controle financeiro,cartão,fatura,parcelas,metas,economizar,dinheiro
```

### Descrição (até 4.000)

```
Sua grana, sem mistério.

O Kash junta cartões, contas, parcelas, contas fixas e metas num app só. Lance um gasto em 3 toques e saiba sempre quanto sobra até o fim do mês.

ASSISTENTE KASH
Tire dúvidas sobre o seu dinheiro numa conversa: "vale a pena comprar um celular de R$ 2.000 em 10x?", "onde dá pra economizar?", "quanto posso gastar por dia até o fim do mês?". O assistente olha seus saldos, faturas, parcelas, contas fixas e metas antes de responder. Também dá pra lançar escrevendo, como "gastei 30 no Uber": você confere e toca em Lançar.

CARTÕES E PARCELAS
• Fatura atual, limite usado e disponível de cada cartão
• Compras parceladas em até 24x, inclusive as que você fez antes de usar o Kash
• Fatura fechada todo mês, com aviso e pagamento pela conta

RELATÓRIOS
• Gastos do dia, da semana e do mês, comparados com o período anterior
• "No ritmo atual, você fecha o mês em…": saiba antes de passar do limite
• Gastos por categoria mês a mês e onde você mais gastou

PREVISÃO
Veja o que já está comprometido nos próximos 6 meses com contas fixas e parcelas, antes de assumir uma nova compra.

METAS
Viagem, celular novo, reserva de emergência. Guarde um pouco por vez, receba lembrete no dia do depósito e veja quando você chega lá.

E MAIS
• Contas correntes, poupança, carteira e investimentos
• Transferência entre contas sem bagunçar os gastos
• Contas fixas com lembrete antes do vencimento
• Limite mensal, inteiro ou separado entre cartão e o resto
• Importe a fatura do cartão (PDF, mesmo com senha) ou o extrato da conta (OFX, CSV)
• Widget na tela inicial e na tela bloqueada, Siri e Atalhos
• Categorias com nome e cor do seu jeito
• Entre com Apple, Google ou e-mail
• Face ID, tema claro e escuro, ocultar valores
• Use também no computador: kash.app.br, com a mesma conta e os mesmos dados

SEUS DADOS SÃO SEUS
O Kash não pede senha de banco e nunca mexe no seu dinheiro: você lança o que quiser ou importa um arquivo. Exporte seus dados, zere tudo ou exclua a conta quando quiser, direto no app.
```

### Notas para a revisão da Apple (App Review Information › Notes)

Preencha a senha da conta de demonstração antes de enviar.

```
Demo account (already filled with sample data):
E-mail: dedeloureiro003@gmail.com
Password: <PREENCHER>

What's new in 1.2.0:
1. AI assistant (Home > chat bubble at the bottom right). It answers questions about the user's own finances using the Claude model by Anthropic. Before the first use, a consent screen explains what is sent (a summary of balances, cards, expenses, installments, bills and goals; no e-mail, phone, last name or card numbers) and the user must tap "Começar". The conversation is stored only on the device. Responses are labeled as AI-generated.
2. Assisted entry: typing "gastei 45 no iFood" in the assistant shows a confirmation card. Nothing is saved until the user taps "Lançar".
3. Daily, weekly and monthly reports (Home > "Hoje" / "Esta semana").
4. Home Screen and Lock Screen widget (opens the assistant or the expense entry; shows no financial data).
5. App Intents: "Perguntar ao Kash", "Lançar gasto", "Lançar entrada" (Shortcuts, Siri, Action button).
6. Reset my data: Profile > "Zerar meus dados" (asks the user to type ZERAR).

Account deletion: Profile > "Excluir conta". The app does not connect to bank accounts; all data is entered or imported by the user.
```

### Privacidade do app (App Store Connect › App Privacy)

Revise antes de enviar, porque o assistente envia dados financeiros a um fornecedor (Anthropic):
- **Informações financeiras** e **Conteúdo do usuário** (as perguntas ao assistente): coletados, vinculados à pessoa, finalidade **Funcionalidade do app**, sem rastreamento.
- Para a Apple, dados que um parceiro processa por você contam como coletados pelo app.

---

## Google Play (Android)

No Android não há widget nem Siri, e o "Zerar meus dados" já saiu na 1.1.0: as notas abaixo não mencionam esses itens.

### Novidades da versão (até 500)

```
• Assistente Kash: pergunte se vale a pena comprar, onde economizar ou quanto ainda pode gastar. Ele responde com os seus números.
• Lance gastos escrevendo: "gastei 45 no iFood" vira um lançamento pronto para conferir.
• Relatórios do dia, da semana e do mês, com comparação e ritmo do limite.
• Atalhos "Hoje" e "Esta semana" no Início.
• Abertura mais limpa enquanto seus dados carregam.
• Correções e melhorias.
```

### Descrição curta (até 80)

```
Cartões, parcelas e metas num app só, com um assistente que entende sua grana.
```

### Descrição completa (até 4.000)

```
Sua grana, sem mistério.

O Kash junta cartões, contas, parcelas, contas fixas e metas num app só. Lance um gasto em 3 toques e saiba sempre quanto sobra até o fim do mês.

ASSISTENTE KASH
Tire dúvidas sobre o seu dinheiro numa conversa: "vale a pena comprar um celular de R$ 2.000 em 10x?", "onde dá pra economizar?", "quanto posso gastar por dia até o fim do mês?". O assistente olha seus saldos, faturas, parcelas, contas fixas e metas antes de responder. Também dá pra lançar escrevendo, como "gastei 30 no Uber": você confere e toca em Lançar.

CARTÕES E PARCELAS
• Fatura atual, limite usado e disponível de cada cartão
• Compras parceladas em até 24x, inclusive as que você fez antes de usar o Kash
• Fatura fechada todo mês, com aviso e pagamento pela conta

RELATÓRIOS
• Gastos do dia, da semana e do mês, comparados com o período anterior
• "No ritmo atual, você fecha o mês em…": saiba antes de passar do limite
• Gastos por categoria mês a mês e onde você mais gastou

PREVISÃO
Veja o que já está comprometido nos próximos 6 meses com contas fixas e parcelas, antes de assumir uma nova compra.

METAS
Viagem, celular novo, reserva de emergência. Guarde um pouco por vez, receba lembrete no dia do depósito e veja quando você chega lá.

E MAIS
• Contas correntes, poupança, carteira e investimentos
• Transferência entre contas sem bagunçar os gastos
• Contas fixas com lembrete antes do vencimento
• Limite mensal, inteiro ou separado entre cartão e o resto
• Importe a fatura do cartão (PDF, mesmo com senha) ou o extrato da conta (OFX, CSV)
• Abra a fatura ou o extrato direto do app do banco ou do e-mail
• Categorias com nome e cor do seu jeito
• Entre com Google, Apple ou e-mail
• Desbloqueio por digital, tema claro e escuro, ocultar valores
• Use também no computador: kash.app.br, com a mesma conta e os mesmos dados

SEUS DADOS SÃO SEUS
O Kash não pede senha de banco e nunca mexe no seu dinheiro: você lança o que quiser ou importa um arquivo. Exporte seus dados, zere tudo ou exclua a conta quando quiser, direto no app.
```

### Segurança dos dados (Play Console › Conteúdo do app › Segurança dos dados)

A versão 7 foi recusada porque o **telefone** (Perfil › Dados pessoais › Celular) não estava declarado. Preenchimento completo, conferido com o código:

**Coleta e segurança**
- O app coleta ou compartilha algum dos tipos de dados exigidos? **Sim**
- Os dados são criptografados em trânsito? **Sim**
- Os usuários podem pedir a exclusão dos dados? **Sim** (no app, em Perfil › Excluir conta, e em https://www.kash.app.br/excluir-conta)

**Tipos de dados** (em todos: *Coletado* = sim, *Compartilhado* = **não**, *Processado de forma temporária* = não)

| Categoria › tipo | Obrigatório ou opcional | Finalidades |
|---|---|---|
| Informações pessoais › **Nome** | Opcional | Funcionalidade do app, Gerenciamento da conta |
| Informações pessoais › **Endereço de e-mail** | Obrigatório | Funcionalidade do app, Gerenciamento da conta, Comunicações do desenvolvedor (lembretes por e-mail, se ligados) |
| Informações pessoais › **Número de telefone** | Opcional | Gerenciamento da conta |
| Informações pessoais › **IDs de usuário** | Obrigatório | Funcionalidade do app, Gerenciamento da conta, Análise |
| Informações financeiras › **Histórico de compras** | Obrigatório | Funcionalidade do app |
| Informações financeiras › **Outras informações financeiras** (saldos, cartões, faturas, metas) | Obrigatório | Funcionalidade do app |
| Mensagens › **Outras mensagens no app** (perguntas ao assistente) | Opcional | Funcionalidade do app |
| Atividade no app › **Interações com o app** | Opcional | Análise |
| Informações e desempenho do app › **Registros de falhas** | Opcional | Análise |
| Informações e desempenho do app › **Diagnóstico** | Opcional | Análise |
| IDs de dispositivo ou outros › **IDs de dispositivo ou outros** | Opcional | Análise |

Por que cada um:
- **Telefone, nome e e-mail:** Perfil › Dados pessoais e o login.
- **IDs de usuário:** id da conta, também enviado ao Firebase.
- **Informações financeiras:** os lançamentos, saldos, cartões e metas, guardados no Supabase; um resumo vai para o assistente.
- **Mensagens:** as perguntas ao assistente vão para a Anthropic, que processa por nós. Fornecedor que processa em nome do app **não** conta como compartilhamento para o Google.
- **Atividade, falhas, diagnóstico e IDs de dispositivo:** Firebase Analytics, Crashlytics e Performance (o id de instância do app). São opcionais porque a pessoa desliga em Perfil › Compartilhar dados de uso.
- **Não coletados:** localização, contatos, fotos, arquivos (OFX, CSV e PDF são lidos no aparelho; do PDF só vai o texto dos lançamentos, já coberto em Informações financeiras) e ID de publicidade (desligado no `firebase.json`).

Em **Conteúdo do app › ID de publicidade**, responda **Não**.

### Acesso ao app (Play Console › Conteúdo do app › Acesso ao app)

Use a mesma conta de demonstração das notas da Apple (e-mail e senha).

---

## Checklist de lançamento

**Antes dos builds**
- [x] `pnpm typecheck`, `pnpm lint`, `pnpm test` e `pnpm test:backend` passando.
- [x] Widget iOS compilado (target `KashWidget`, Release, sem erros).
- [ ] Publicar as Edge Functions `assistant` e `import-assist` em produção (`supabase functions deploy assistant import-assist --project-ref sqpxugyjnlwpkzuxzcpg`).
- [ ] Fazer uma pergunta de verdade ao assistente num build de teste (confirma a chave da Anthropic e o modelo).
- [ ] Login com Apple e Google testados no aparelho.

**Builds e envio**
- [ ] iOS: `cd apps/mobile && eas build -p ios --profile production` **interativo** (1ª vez com o widget: aceitar criar o App ID e o perfil de `com.andreloureiro.kash.widget`).
- [ ] Android: `eas build -p android --profile production`.
- [ ] `eas submit -p ios --latest` e `eas submit -p android --latest` (Android na faixa interna primeiro).
- [ ] Testar o build no TestFlight e na faixa interna (assistente, relatórios, widget, login social).

**Nas lojas**
- [ ] Colar os textos acima (novidades, promocional, descrição, palavras-chave).
- [ ] Atualizar Privacidade do app (Apple) e Segurança dos dados (Google).
- [ ] Preencher a senha da conta de demonstração nas notas da revisão e no Acesso ao app.
- [ ] Capturas de tela novas com o assistente e os relatórios (opcional, mas ajuda na conversão).

**Depois de publicado**
- [ ] Renomear a seção "Próxima versão" do CHANGELOG para "1.2.0" e abrir uma nova.
- [ ] `pnpm demo:reset dedeloureiro003@gmail.com` de tempos em tempos para a demo não envelhecer.
