import { site } from './site';

export interface Pillar {
  title: string;
  text: string;
}

export interface Feature {
  id: string;
  eyebrow: string;
  title: string;
  text: string;
  points: string[];
  screen: { src: string; alt: string };
  /** no desktop, o mockup fica à esquerda */
  reverse: boolean;
}

export interface Extra {
  title: string;
  text: string;
}

export interface Faq {
  q: string;
  a: string;
}

const hasWeb = site.webApp !== null;

export const hero = {
  badge: 'App de finanças pra quem tá começando',
  title: 'Sua grana, sem mistério.',
  lead: 'Cartões, parcelas, contas fixas e metas num app só. Lance um gasto em 3 toques e saiba quanto sobra até o fim do mês.',
  screen: { src: '/screens/home.webp', alt: 'Tela inicial do Kash com saldo total de R$ 4.225,50, gastos do mês e próximas contas' },
};

export const pillars: Pillar[] = [
  { title: '3 toques pra lançar', text: 'Valor, categoria, de onde saiu. Mais rápido que pagar o lanche.' },
  { title: 'Sem surpresa na fatura', text: 'Parcelas organizadas mês a mês, com data pra acabar.' },
  { title: 'Sem senha de banco', text: 'Você lança o que quiser. O Kash nunca mexe no seu dinheiro.' },
];

export const features: Feature[] = [
  {
    id: 'cartoes',
    eyebrow: 'Cartões e parcelas',
    title: 'Parcelou? A gente organiza.',
    text: 'Lance a compra uma vez e o Kash distribui as parcelas nas próximas faturas. Você vê o limite usado, o fechamento e o que ainda falta pagar.',
    points: ['Fatura atual e limite disponível de cada cartão', 'Parcelas em aberto com mês de término', 'Até 24x, sem conta de cabeça'],
    screen: { src: '/screens/cards.webp', alt: 'Tela de cartões do Kash com a fatura atual, o limite usado e as parcelas em aberto' },
    reverse: false,
  },
  {
    id: 'previsao',
    eyebrow: 'Previsão',
    title: 'Veja o mês que vem antes de ele chegar.',
    text: 'A previsão soma suas contas fixas e as parcelas do cartão dos próximos 6 meses. Assim você sabe quanto já está comprometido antes de gastar.',
    points: ['6 meses à frente, mês a mês', 'Separado entre contas fixas e parcelas', 'Quanto do seu limite mensal já foi'],
    screen: { src: '/screens/forecast.webp', alt: 'Tela de previsão do Kash com o total comprometido em cada um dos próximos meses' },
    reverse: true,
  },
  {
    id: 'metas',
    eyebrow: 'Metas',
    title: 'Metas que saem do papel.',
    text: 'Viagem, celular novo, reserva de emergência. Guarde um pouco por vez e o Kash calcula quando você chega lá.',
    points: ['Progresso visual de cada meta', 'Estimativa de quantos meses faltam', 'Dicas com base nos seus gastos'],
    screen: { src: '/screens/goals.webp', alt: 'Tela de metas do Kash com o progresso de cada meta e quanto falta' },
    reverse: false,
  },
];

export const extras: Extra[] = [
  { title: 'Contas bancárias', text: 'Corrente, poupança, carteira e investimentos com saldo total num relance.' },
  { title: 'Contas fixas', text: 'Aluguel, internet, academia. Lembrete antes do vencimento e marcar como paga com um toque.' },
  { title: 'Relatórios', text: 'Gastos por categoria e comparação com o mês anterior.' },
  { title: 'Limite mensal', text: 'Defina quanto quer gastar e veja quanto ainda sobra.' },
  { title: 'Ocultar valores', text: 'Um toque e os números somem. Ideal pra abrir o app em público.' },
  { title: 'Tema claro e escuro', text: 'Do jeito que for mais confortável pros seus olhos.' },
];

export const privacyCallout = {
  eyebrow: 'Privacidade',
  title: 'Seus dados são seus. Ponto.',
  text: 'A gente não pede senha de banco, não vende seus dados e não mostra anúncio com base no que você gasta.',
  points: ['Dados criptografados e guardados no Brasil', 'Em conformidade com a LGPD', 'Exclua sua conta e tudo some, direto no app'],
};

export const faqs: Faq[] = [
  {
    q: 'O Kash é grátis?',
    a: hasWeb
      ? 'Sim. Você pode usar todos os recursos no iPhone, no Android e no navegador sem pagar nada.'
      : 'Sim. Você pode usar todos os recursos no iPhone e no Android sem pagar nada.',
  },
  { q: 'Preciso conectar minha conta do banco?', a: 'Não. No Kash você lança seus gastos e saldos manualmente. A gente nunca pede senha de banco e não movimenta dinheiro.' },
  { q: 'Como funciona o parcelamento?', a: 'Ao lançar uma compra no cartão, escolha em quantas vezes foi. O Kash coloca cada parcela na fatura certa e mostra quantas faltam e quando terminam.' },
  { q: 'O que é a previsão de gastos?', a: 'É uma visão dos próximos 6 meses com tudo que já está comprometido: contas fixas e parcelas do cartão. Assim você sabe antes se dá pra fazer uma compra nova.' },
  hasWeb
    ? { q: 'Meus dados ficam sincronizados entre app e web?', a: 'Sim. Entre com a mesma conta e tudo que você lança no celular aparece no navegador, e vice-versa.' }
    : { q: 'Meus dados ficam salvos se eu trocar de celular?', a: 'Sim. Seus dados ficam na sua conta: é só entrar com o mesmo e-mail no aparelho novo.' },
  { q: 'Posso apagar minha conta?', a: 'Pode, a qualquer momento, em Perfil → Excluir conta. Todos os seus dados são apagados de forma definitiva.' },
];

export const finalCta = {
  title: 'Feche o mês no verde.',
  text: hasWeb ? 'Grátis no iPhone, no Android e no navegador.' : 'Grátis no iPhone e no Android.',
};

export const nav = [
  { href: '#recursos', label: 'Recursos' },
  { href: '#privacidade', label: 'Privacidade' },
  { href: '#perguntas', label: 'Perguntas' },
];
