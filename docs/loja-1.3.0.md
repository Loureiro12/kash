# Kash 1.3.0 — textos e checklist das lojas

Textos prontos para colar na App Store Connect e na Google Play Console. Os limites de cada campo estão entre parênteses e já foram conferidos.
A 1.2.0 (aprovada na App Store, build 14) está em [`loja-1.2.0.md`](loja-1.2.0.md); o que mudar aqui vale a partir da 1.3.0. O que mudou nesta versão está em [`apps/mobile/CHANGELOG.md`](../apps/mobile/CHANGELOG.md); o passo a passo técnico em [`docs/release.md`](release.md) › 5.2.

---

## App Store (iOS)

### Novidades desta versão (até 4.000)

```
Novidades desta versão:

• Conta compartilhada do casal: convide seu par, dividam contas, cartões, contas fixas e metas, e recebam um aviso a cada gasto ou entrada. Cada um escolhe o que vê.
• Retrospectiva do mês: no começo de cada mês, veja quanto entrou, quanto saiu, onde mais gastou e compare com o mês anterior. Compartilhe como imagem, com ou sem os valores.
• "E aí Siri, lançar no Kash": diga "gastei 30 no Uber" e confirme num toque.
• Lance pela foto: fotografe a nota fiscal, o cupom ou o comprovante do Pix e o Kash preenche valor, lugar, data e categoria.
• Guarde o comprovante: anexe a foto a qualquer lançamento.
• Tags e modo viagem: junte os gastos de uma viagem ou de um evento e veja quanto saiu, por dia e por categoria.
• Quem me deve: anote empréstimos e contas divididas, receba o lembrete no dia e cobre com uma mensagem pronta.
• Widget com números: quanto saiu hoje e quanto sobra no mês, direto na tela inicial e na tela bloqueada.
• Alertas de gastos: o Kash avisa quando você chega a 80% do limite, quando o ritmo do mês vai estourar e quando uma categoria sai do normal. E todo domingo, o resumo da semana.
• Assinaturas encontradas: o Kash acha as cobranças que se repetem todo mês e avisa quando ficam mais caras.
• Lançar ficou mais rápido: teclado do celular, calendário, categoria sugerida e categoria nova sem sair do lançamento.
• O app agora aparece todo em português, inclusive câmera e fotos.
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

What's new in 1.3.0:
1. Receipt photo: the camera button in the AI assistant (Home > chat bubble), or the scan button next to the description in the "+" entry sheet, lets the user take or pick a photo of a receipt. The photo is resized on the device and sent to Claude (Anthropic) only to read the entry; it is not stored on the device or on our servers. A confirmation card appears and nothing is saved until the user taps "Lançar". Camera and photo library access are requested only at that moment.
2. Faster entry sheet: the amount uses the system number pad, the date button opens a calendar, and the category is suggested from previous entries with the same description.
3. Spending alerts (local notifications computed on the device; Profile > "Alertas de gastos" and "Resumo da semana"): 80% and 100% of the monthly budget, spending pace, unusual category spending, price increases of subscriptions, and a weekly summary on Sundays at 7 pm. No data leaves the device for this.
4. Detected subscriptions (Accounts > "Fixas" tab): recurring charges found in the user's own entries, with "Virar conta fixa" (turn into a fixed bill) and "Ignorar".
5. The app is now localized in Brazilian Portuguese (system screens such as the camera and photo picker follow it).
6. Monthly recap (Home, first days of the month; or Report > a past month): a shareable card; "Esconder valores" hides amounts before sharing.
7. Siri: "Lançar no Kash" asks what to log ("gastei 30 no Uber") and opens a confirmation sheet in the app; nothing is saved until the user taps "Lançar".
8. Tags and travel mode (Report > "Tags e modo viagem"); "Quem me deve" (Accounts > "A receber") to track money friends owe, with reminders and a share sheet to send a message.
9. Widgets: "Gastos do Kash" shows today's spending and what is left of the monthly budget (hidden when "ocultar valores" is on; redacted on the Lock Screen while locked).
11. Shared couple account (Profile > "Conta compartilhada"): one person invites the other with an 8-letter code. Accounts, cards, bills and goals marked "Compartilhar com…" are visible and editable by both; each new entry in them sends a push notification to the other person. Personal data stays private unless the owner chooses to show it (read-only). To test it, a second account is needed; we can provide one on request.
10. Receipt attachment: open a saved entry > "Anexar comprovante". The photo is stored privately in the user's account (Supabase Storage) and deleted with the account.

Account deletion: Profile > "Excluir conta". The app does not connect to bank accounts; all data is entered or imported by the user.
```

### Privacidade do app (App Store Connect › App Privacy)

Revise antes de enviar, porque o assistente envia dados financeiros a um fornecedor (Anthropic):
- **Informações financeiras** e **Conteúdo do usuário** (as perguntas ao assistente): coletados, vinculados à pessoa, finalidade **Funcionalidade do app**, sem rastreamento.
- **Conteúdo do usuário › Fotos ou vídeos**: coletado, vinculado à pessoa, finalidade **Funcionalidade do app**, sem rastreamento. Dois usos: a foto enviada ao assistente para ler o lançamento (não guardada) e o comprovante anexado ao lançamento (guardado no Supabase Storage, privado).
- Para a Apple, dados que um parceiro processa por você contam como coletados pelo app.

---

## Google Play (Android)

No Android não há widget nem Siri, e o "Zerar meus dados" já saiu na 1.1.0: as notas abaixo não mencionam esses itens.

### Novidades da versão (até 500)

```
• Conta compartilhada do casal, com aviso a cada gasto.
• Retrospectiva do mês, para ver e compartilhar.
• Widget do Kash com o gasto de hoje e o que sobra no mês.
• Lance pela foto da nota e guarde o comprovante.
• Tags e modo viagem; quem me deve, com lembrete de cobrar.
• Alertas de limite e resumo da semana.
• Assinaturas encontradas; lançar mais rápido.
• O teclado não cobre mais os campos.
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
| Fotos e vídeos › **Fotos** (comprovante anexado ao lançamento, guardado; e a foto enviada ao assistente) — *Processado de forma temporária* = **não** | Opcional | Funcionalidade do app |
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
- **Fotos:** o comprovante que a pessoa anexa a um lançamento fica guardado no Supabase Storage (privado, apagado com a conta), por isso **não** é temporário. A foto enviada ao assistente vai para a Anthropic só para ler o lançamento.
- **Conta compartilhada:** o token de push do aparelho (Expo) entra em **IDs de dispositivo ou outros**, finalidade **Funcionalidade do app** (além de Análise, do Firebase). O que a pessoa lança no compartilhado é visto pela outra pessoa da conta, por escolha dela (não é "compartilhamento com terceiros" no sentido do Google).
- **Quem me deve:** nomes e valores de quem deve à pessoa entram em **Outras informações financeiras** (ficam só na conta dela; o Kash não contata ninguém).
- **Não coletados:** localização, contatos, arquivos (OFX, CSV e PDF são lidos no aparelho; do PDF só vai o texto dos lançamentos, já coberto em Informações financeiras) e ID de publicidade (desligado no `firebase.json`).

Em **Conteúdo do app › ID de publicidade**, responda **Não**.

### Acesso ao app (Play Console › Conteúdo do app › Acesso ao app)

Use a mesma conta de demonstração das notas da Apple (e-mail e senha).

---

## Checklist de lançamento

**Antes dos builds**
- [x] `pnpm typecheck`, `pnpm lint`, `pnpm test` e `pnpm test:backend` passando.
- [x] Backend em produção: migração `20261022000000_bill_from_recurring` e função `assistant` com foto (publicados em 26/11).
- [ ] Backend em produção **antes do app**: migrações `20261023000000_tags_travel`, `20261024000000_debts` e `20261025000000_attachments` (bucket `receipts`), e a função `delete-account` (apaga os comprovantes).
- [ ] Migração `20261026000000_households` em produção antes do app (RLS nova: rodar `pnpm test:backend` contra o local antes).
- [ ] **Push pelo servidor (conta compartilhada):** credenciais no EAS. iOS: `eas credentials -p ios` › Push Notifications › criar ou usar uma chave APNs. Android: no Firebase do Kash, Configurações › Contas de serviço › gerar a chave JSON; depois `eas credentials -p android` › Google Service Account Key para FCM V1. Sem isso, o app registra o aparelho, mas os avisos não chegam.
- [ ] App Group `group.com.andreloureiro.kash` (widget com números): o primeiro `eas build -p ios` depois dele pode precisar ser interativo para o EAS registrar o grupo no app e na extensão do widget.
- [x] `app.json` em **1.3.0** (a Apple fecha a versão depois de aprovada: builds 15 e 16 da 1.2.0 foram recusados no envio).

**Builds e envio**
- [ ] iOS: `cd apps/mobile && eas build -p ios --profile production --auto-submit`.
- [ ] Android: `eas build -p android --profile production --auto-submit` (faixa interna).
- [ ] Testar no TestFlight e na faixa interna: foto do comprovante com notas reais, alertas (permissão de notificações), assinaturas, novo modal de lançamento, telas do sistema em português.

**Nas lojas**
- [ ] App Store Connect › Informações do app › **Idioma principal: Português (Brasil)**.
- [ ] Colar as Novidades e as notas da revisão acima; descrição e palavras-chave podem continuar as da 1.2.0.
- [ ] Privacidade do app (Apple): acrescentar **Fotos**. Segurança dos dados (Google): acrescentar **Fotos** (processado de forma temporária).
- [ ] Preencher a senha da conta de demonstração nas notas da revisão e no Acesso ao app.

**Depois de publicado**
- [ ] Renomear a seção "Próxima versão" do CHANGELOG para "1.3.0" e abrir uma nova.
- [ ] `pnpm demo:reset dedeloureiro003@gmail.com` de tempos em tempos para a demo não envelhecer.
