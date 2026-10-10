import { site } from './site';

/**
 * Termos de uso (mesmo texto do app, `apps/mobile/src/features/legal/content.ts`).
 * ATENÇÃO: modelo — precisa de revisão jurídica antes de publicar.
 */
export const termsDoc = {
  title: 'Termos de uso',
  updatedAt: site.privacyUpdatedAt,
  sections: [
    { title: '1. O que é o Kash', body: 'O Kash é um app de organização financeira pessoal. Você lança seus gastos manualmente; não movimentamos dinheiro nem acessamos suas contas bancárias.' },
    { title: '2. Sua conta', body: 'Você é responsável por manter sua senha segura. Menores de 18 anos podem usar o app com ciência de um responsável.' },
    { title: '3. Uso aceitável', body: 'Não use o Kash para atividades ilegais ou para tentar acessar dados de outras pessoas.' },
    { title: '4. Encerramento', body: 'Você pode excluir sua conta a qualquer momento em Perfil → Excluir conta. Todos os dados são apagados em até 30 dias.' },
  ],
};

/** Perguntas frequentes da Ajuda (mesmas do app). */
export const helpFaq = [
  { q: 'O Kash acessa minha conta do banco?', a: 'Não. Você lança tudo manualmente; não pedimos senha de banco nem usamos Open Finance.' },
  { q: 'Como funciona o parcelamento no cartão?', a: 'Ao lançar um gasto no cartão você escolhe o número de parcelas. A primeira entra no mês da compra e as outras aparecem na Previsão, mês a mês. Dá pra lançar uma compra antiga: as parcelas que já passaram contam como pagas.' },
  { q: 'Como registro dinheiro que passei de uma conta pra outra?', a: 'Use Transferir (em Contas bancárias ou na opção Transferência do Lançar gasto). O saldo sai de uma conta e entra na outra, e não conta como gasto nem como entrada.' },
  { q: 'O que acontece quando marco uma conta fixa como paga?', a: 'O Kash cria o lançamento do mês: na fatura, se a conta for cobrada no cartão, ou debitando o saldo, se for na conta.' },
  { q: 'Uso o Kash no celular e no computador. Os dados são os mesmos?', a: 'Sim. Entre com o mesmo e-mail e tudo aparece nos dois lugares.' },
  { q: 'Tem atalhos de teclado?', a: 'Tem: aperte N em qualquer tela para lançar um gasto e Esc para fechar janelas.' },
] as const;

export const SUPPORT_EMAIL = 'oi@kash.app';
