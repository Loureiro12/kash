# Kash (app) — histórico de versões

As melhorias do app ficam acumuladas em **Próxima versão** e vão juntas para as lojas num build novo.
Enquanto isso, **não publique `eas update`**: com `runtimeVersion = appVersion`, um update feito agora
só alcançaria binários 1.1.0 (que ainda não existem), e quem está no 1.0.1 continua como está.
Checklist de lançamento em `docs/release.md` › 5.2.

## Próxima versão — 1.1.0 (em preparação)

Base: builds 1.0.1 (iOS 6, Android 3), feitos no commit `9ea8010`.

- **Lembrete por e-mail** no Perfil › Preferências: opt-in, e-mail às 9h com contas e faturas que vencem em 2 dias e os depósitos de metas do dia. Independente da notificação push e sincronizado com o Kash web. Precisa do backend publicado (migração `20261012000000_email_reminders` + função `send-reminders`).
- **Relatório com os meses reais**: o gráfico de 6 meses e a comparação com o mês anterior usam os lançamentos de verdade (antes os 5 meses anteriores eram valores de exemplo). Sem gastos no mês anterior, mostra "Sem gastos em <mês> pra comparar".
- O texto do lembrete push passou a "Notificação 2 dias antes do vencimento", para diferenciar do e-mail.
- **Correção:** Perfil e Ajuda mostravam "1.0.0" fixo; agora mostram a versão real do app.

### Texto de "Novidades" para as lojas

> Novidades desta versão:
> • Lembrete por e-mail: ligue em Perfil › Preferências e receba às 9h as contas e faturas que vencem em 2 dias.
> • Relatório mais fiel: o gráfico dos últimos meses agora usa os seus lançamentos de verdade.
> • Use o Kash também no computador: www.kash.app.br (mesma conta, mesmos dados).
> • Pequenas correções.

## 1.0.1

- Desbloqueio com Face ID / Touch ID / digital (módulo nativo → build novo).
- Previsão: tocar num mês recalcula total, divisão, limite e acumulado (build iOS 6 / Android 3).

## 1.0.0

- Primeira versão: lançamentos, cartões e parcelas (inclusive compras antigas), contas, contas fixas, metas, relatório, previsão, categorias, cores personalizadas, lembretes push, exportar dados e excluir conta.
