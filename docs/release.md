# Release em produção (Supabase + EAS)

> **Identificador do app:** `com.andreloureiro.kash` nas duas plataformas (`com.kash.app` já estava registrado na Apple por outra conta; trocado antes de qualquer publicação). O esquema de deep link continua `kash://`.

> **Estado em 2026-10-07:** projeto Supabase `kash` (ref `sqpxugyjnlwpkzuxzcpg`, região `ca-central-1`) criado e ligado; migrações, Edge Function `delete-account`, `site_url`/redirects aplicados; `pg_cron` agendado (`kash-rollover-daily`, 03:05 UTC). Projeto EAS `@loureiro_12/kash` ligado, EAS Update configurado e variáveis de produção criadas. Keystore Android gerada e guardada no EAS; variáveis de produção/preview/development criadas; primeiros builds concluídos e testados contra a produção: Android preview (APK instalável) e produção (AAB para o Play), iOS preview (simulador). Links e downloads em https://expo.dev/accounts/loureiro_12/projects/kash/builds. Credenciais Apple feitas (time G58V8BP6VH); build iOS 1.0.0 (1) enviado ao App Store Connect (app id 6820170870, TestFlight). O nome "Kash" já existe na App Store: o registro ficou como "Kash (a67172)" e precisa de um nome definitivo único (ex.: "Kash Finanças") em App Store Connect → App Information antes da revisão. Falta: SMTP próprio (passo 1.5), envio Android (passo 2.5), ficha da loja (seção 4).

Checklist de uma vez só, na ordem. Só produção (sem staging). Tudo que precisa da sua conta está marcado com **[você]**; o resto já está no repositório.

## 1. Supabase — projeto de produção

1. **[você]** Crie o projeto em https://supabase.com/dashboard (região `sa-east-1` / São Paulo; guarde a senha do banco). Anote o **project ref** (20 letras na URL do projeto). *Feito: o projeto atual ficou em `ca-central-1` (Canadá). A região não muda depois; se quiser latência menor para usuários no Brasil, recrie em São Paulo antes de ter dados reais e repita os passos 1.3–1.4 e 2.3.*
2. **[você]** Token pessoal em https://supabase.com/dashboard/account/tokens → `export SUPABASE_ACCESS_TOKEN=...`.
3. Preencha `project_id` em `[remotes.production]` no `supabase/config.toml` com o ref.
4. Primeiro deploy, no seu terminal:
   ```bash
   export SUPABASE_PROJECT_REF=<ref>
   pnpm db:link            # pede a senha do banco; grava em supabase/.temp (gitignored)
   pnpm deploy:backend     # db push (migrações, sem seed) → functions deploy → config push (templates de e-mail, redirects, confirmação de e-mail)
   ```
   `pnpm config:push` roda `scripts/config-push.sh`, que aplica `site_url`/redirects do app e deixa a **confirmação de e-mail ligada** (o cadastro mostra "Confira seu e-mail" até confirmar). **Templates de e-mail ficam de fora por padrão**: o plano gratuito sem SMTP próprio recusa qualquer template customizado e o push inteiro falha. Depois do passo 1.5, rode `KASH_SMTP=1 pnpm config:push` (ou defina a variável `KASH_SMTP=1` no environment do GitHub) para enviar o template de recuperação com o deep link. Até lá, o e-mail padrão do Supabase funciona: ele redireciona para `kash://reset-password#access_token=…`, formato que o app também entende.
5. **[você]** No dashboard, Authentication → SMTP: configure um provedor (Resend, Postmark…). O SMTP padrão do Supabase limita a poucos e-mails por hora e não serve para usuários reais.
6. Confira no SQL Editor que a virada de mês está agendada: `select * from cron.job;` deve listar o job diário (criado pela migração inicial; `pg_cron` já vem habilitado nos projetos hospedados).
7. **[você]** Em Settings → API copie `Project URL` e `anon public key` (vão para o EAS no passo 2.3).
8. **Lembretes por e-mail** (Edge Function `send-reminders`, cron `kash-email-reminders` às 09:00 de Brasília). Depois do deploy das funções, uma vez só:
   ```bash
   SECRET=$(openssl rand -hex 32)   # mesmo valor nos dois lugares abaixo
   supabase secrets set --project-ref "$SUPABASE_PROJECT_REF" \
     RESEND_API_KEY=re_... \
     REMINDERS_FROM='Kash <nao-responda@mail.kash.app.br>' \
     APP_URL=https://www.kash.app.br \
     REMINDERS_CRON_SECRET="$SECRET"
   echo "$SECRET"
   ```
   No SQL Editor (troque `<SECRET>` pelo valor impresso):
   ```sql
   select vault.create_secret('https://<ref>.supabase.co', 'kash_project_url');
   select vault.create_secret('<SECRET>', 'kash_reminders_secret');
   ```
   - A API key do Resend precisa poder enviar pelo domínio do `REMINDERS_FROM` (ver o erro 550 do SMTP). Pode ser a mesma do SMTP.
   - Testar sem enviar: `curl -X POST https://<ref>.supabase.co/functions/v1/send-reminders -H "x-kash-cron: $SECRET" -d '{"dryRun":true}'` (lista quem receberia hoje). Sem o `dryRun`, envia de verdade.
   - Sem os segredos do Vault o cron não faz nada; sem `RESEND_API_KEY` a função responde 503.
   - Só recebe quem ligou "Lembrete de contas" no Perfil do Kash web (`profiles.email_reminder`, desligado por padrão). Um e-mail por pessoa por dia (`reminder_emails`).

9. **Importação de PDF com IA** (Edge Function `import-assist`, publicada junto com as outras). Uma vez só:
   ```bash
   supabase secrets set --project-ref "$SUPABASE_PROJECT_REF" ANTHROPIC_API_KEY=sk-ant-...
   # opcional: outro modelo (padrão claude-sonnet-5-5)
   # supabase secrets set --project-ref "$SUPABASE_PROJECT_REF" IMPORT_AI_MODEL=claude-sonnet-5-5
   ```
   - A chave fica só no servidor. Sem ela, a tela de importação avisa que a leitura de PDF não está disponível; OFX e CSV funcionam sem IA.
   - Limite: 30 leituras por pessoa a cada 24 h (`ai_calls`, também usado para acompanhar o custo: `select date(created_at), count(*), sum(input_tokens), sum(output_tokens) from ai_calls group by 1 order by 1 desc;`).
   - A política de privacidade (seção "Compartilhamento") já cita o envio do texto (sem dados pessoais) à Anthropic.

## 2. Expo / EAS — app

1. **[você]** `cd apps/mobile && eas login` (conta Expo), depois:
   ```bash
   eas init                     # cria o projeto no EAS e grava extra.eas.projectId no app.json
   eas update:configure         # grava updates.url no app.json (runtimeVersion já está como appVersion)
   ```
   Commit as duas linhas que esses comandos adicionam ao `app.json`.
2. Credenciais nativas (uma vez). Android: **feito**, a keystore foi gerada e fica no EAS (`eas credentials -p android` mostra e permite baixar um backup). iOS: **[você]**, precisa de uma conta no Apple Developer Program (US$ 99/ano) e login interativo com 2FA, por isso não dá para automatizar: `cd apps/mobile && eas credentials -p ios`, escolha *production*, entre com o Apple ID e deixe o EAS criar o certificado de distribuição e o perfil de provisionamento. Depois disso `eas build -p ios --profile production` funciona também pela CI.
3. Variáveis de produção (ficam no EAS, não no repositório):
   ```bash
   eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value https://<ref>.supabase.co --visibility plaintext
   eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <anon key> --visibility plaintext
   ```
   (`preview`/`development` podem apontar para o mesmo projeto ou ficar sem valor para usar o `.env` local.)
4. Primeiro build de loja: `eas build --platform all --profile production` (perfil em `eas.json`; `autoIncrement` cuida de `buildNumber`/`versionCode`).
5. Envio iOS: `eas submit --platform ios --latest`. O perfil em `eas.json` só traz o `appleTeamId`; na primeira vez o EAS pede o Apple ID, procura o app no App Store Connect pelo bundle id e oferece criar o registro (nome, idioma, SKU) se não existir; depois grava o `ascAppId` sozinho. Pré-requisito: aceitar os contratos pendentes em https://appstoreconnect.apple.com → Agreements. Envio Android: `eas submit --platform android --latest` (faixa interna); o primeiro envio precisa ser manual pelo Play Console (criar o app e subir o AAB uma vez) e, para automatizar, uma service account do Google Play.
6. Updates só de JS depois do lançamento: `eas update --branch production --message "..."`. O canal `production` do build aponta para o branch `production`. Mudou dependência nativa, versão em `app.json` ou plugin? Então é build novo, não update (a `runtimeVersion` = versão do app garante que um update nunca cai num binário incompatível).

## 3. GitHub Actions

Crie o environment **production** no repositório e, nele:

| Tipo | Nome | Valor |
|---|---|---|
| secret | `SUPABASE_ACCESS_TOKEN` | token pessoal (passo 1.2) |
| secret | `SUPABASE_DB_PASSWORD` | senha do banco (passo 1.1) |
| variable | `SUPABASE_PROJECT_REF` | ref do projeto |
| secret | `EXPO_TOKEN` | token em https://expo.dev/accounts/<conta>/settings/access-tokens |

- `deploy-backend.yml` roda a cada push em `main` que mude `supabase/**` (migrações, functions, templates, config) e aplica em produção. Se faltar a variável ou algum secret no environment, o primeiro passo falha com a mensagem do que configurar.
- `release-app.yml` é manual (Actions → "Release do app (EAS)"): marque *build* para gerar binários de loja e/ou *update* para publicar o JS no canal `production`.
- `ci.yml` continua testando tudo contra um Supabase local (pgTAP, Vitest, Jest, drift dos tipos).

## 4. Antes de publicar

- [ ] Política de privacidade e termos publicados em URL pública (as lojas exigem link); o texto já está no app (`src/features/legal`).
- [ ] Exportar e excluir conta funcionam em produção (teste com uma conta real): Perfil → "Exportar meus dados" e "Excluir conta".
- [ ] Recuperação de senha: em clientes de e-mail que não tornam `kash://` clicável, o usuário não consegue tocar no link. Solução definitiva: um universal link `https://` (página estática que redireciona para o esquema) — exige domínio; pendente.
- [ ] App Store: capturas de tela, categoria Finanças, declaração de criptografia já marcada como isenta (`ITSAppUsesNonExemptEncryption=false`).
- [ ] Play Console: formulário de segurança de dados (coleta e-mail, dados financeiros inseridos pelo usuário; criptografados em trânsito; exclusão disponível no app).
- [ ] Rotação: o `anon key` é público por desenho (RLS protege os dados); o `service_role` nunca entra no app nem no repositório.

## 5. Android

Compilado e validado localmente no emulador Pixel 7 (debug, dev client): ícone adaptativo, splash, onboarding e login funcionam; notificações usam o canal `reminders`. Os builds de loja saem pelo EAS (passo 2.4), que também gera a keystore. A suíte Maestro completa está validada no iOS; no Android ver `apps/mobile/e2e/README.md`.

## 5.1 Versão 1.0.1 (Face ID)

O Face ID adicionou um módulo nativo (`expo-local-authentication`). A versão subiu para **1.0.1**, o que muda a `runtimeVersion`: updates OTA publicados a partir daqui só chegam a binários 1.0.1. Para entregar, gere e envie um build novo (`eas build -p ios --profile production` e `eas submit -p ios --latest`); quem está no 1.0.0 continua recebendo só updates do 1.0.0.

## 5.2 Versão 1.1.0 (em preparação — sai junto com as próximas melhorias)

As mudanças do app vão se acumulando em `apps/mobile/CHANGELOG.md` › "Próxima versão". A versão em `app.json` já está em **1.1.0**, então nenhum `eas update` alcança quem está no 1.0.1 por engano. **Não publique updates até o build 1.1.0 estar nas lojas.**

Quando decidir lançar:
1. Backend primeiro (o app 1.1.0 usa `email_reminder`): merge em `main` ou `pnpm deploy:backend`, e os segredos dos lembretes (item 1.8).
2. Builds: `cd apps/mobile && eas build -p all --profile production` (build number / version code sobem sozinhos).
3. Envio: `eas submit -p ios --latest` e `eas submit -p android --latest` (Android na faixa de teste interno primeiro).
4. Nas lojas, cole o texto de "Novidades" do CHANGELOG.
5. Depois de publicado: renomeie a seção do CHANGELOG para "1.1.0" e abra uma nova "Próxima versão". Correções só de JS para o 1.1.0 voltam a poder ir por `eas update --branch production --environment production`.

## 6. Fluxo do dia a dia

1. Mudou o banco? Nova migração em `supabase/migrations`, `pnpm db:reset`, `pnpm db:types`, testes; o merge em `main` aplica em produção.
2. Mudou só JS? Merge e rode o workflow de release com *update*.
3. Mudou algo nativo? Suba a versão em `app.json`, rode o workflow com *build*, envie para as lojas.
