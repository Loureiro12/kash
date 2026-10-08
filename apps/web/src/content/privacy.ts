import { site } from './site';

/**
 * Política de privacidade (texto do handoff). ATENÇÃO: é um modelo e precisa de revisão jurídica
 * antes de publicar; ver apps/web/README.md › "Antes de publicar".
 */
export interface PolicySection {
  id: string;
  title: string;
  paragraphs: string[];
  list?: string[];
}

export const privacyIntro = {
  title: 'Política de privacidade',
  updatedAt: site.privacyUpdatedAt,
  summaryTitle: 'Resumo rápido',
  summary: 'Coletamos só o necessário pra o Kash funcionar. Não pedimos senha de banco, não vendemos seus dados e você pode apagar tudo quando quiser.',
};

export const privacySections: PolicySection[] = [
  {
    id: 'quem-somos',
    title: 'Quem somos',
    paragraphs: [
      'O Kash é um aplicativo de organização financeira pessoal, disponível para iPhone, Android e navegador. Esta política explica quais dados pessoais tratamos, por que, e quais são os seus direitos, de acordo com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 – LGPD).',
    ],
  },
  {
    id: 'dados',
    title: 'Quais dados coletamos',
    paragraphs: ['Coletamos apenas o necessário para o Kash funcionar:'],
    list: [
      'Dados de cadastro: nome, e-mail e, se você informar, número de celular.',
      'Dados financeiros que você mesmo lança: gastos, entradas, cartões (apelido, últimos 4 dígitos, limite e datas), contas bancárias (apelido e saldo), contas fixas e metas.',
      'Dados técnicos: tipo de aparelho, sistema operacional, versão do app e registros de erro, para manter o serviço estável.',
    ],
  },
  {
    id: 'nao-coletamos',
    title: 'O que não coletamos',
    paragraphs: [],
    list: ['Senhas de banco ou acesso às suas contas bancárias.', 'Número completo do cartão, CVV ou data de validade.', 'Sua localização.', 'Contatos, fotos ou arquivos do seu aparelho.'],
  },
  {
    id: 'uso',
    title: 'Como usamos seus dados',
    paragraphs: ['Usamos seus dados para:'],
    list: [
      'Mostrar seu saldo, faturas, parcelas, previsões, relatórios e metas.',
      'Enviar lembretes de contas, se você ativar essa opção.',
      'Sincronizar suas informações entre celular e navegador.',
      'Garantir a segurança da sua conta e corrigir problemas técnicos.',
      'Cumprir obrigações legais.',
    ],
  },
  {
    id: 'bases',
    title: 'Bases legais',
    paragraphs: [
      'Tratamos seus dados com base na execução do contrato (para prestar o serviço que você pediu), no seu consentimento (por exemplo, para lembretes), no legítimo interesse (segurança e melhoria do app) e no cumprimento de obrigação legal, conforme o artigo 7º da LGPD.',
    ],
  },
  {
    id: 'compartilhamento',
    title: 'Compartilhamento',
    paragraphs: [
      'Não vendemos seus dados e não usamos seus gastos para mostrar anúncios. Compartilhamos dados apenas com fornecedores que nos ajudam a operar o Kash, como hospedagem em nuvem e envio de e-mails, sempre sob contrato e com o mínimo necessário. Também podemos compartilhar dados se houver ordem judicial ou exigência legal.',
    ],
  },
  {
    id: 'seguranca',
    title: 'Armazenamento e segurança',
    paragraphs: [
      'Seus dados ficam em servidores localizados no Brasil, com criptografia em trânsito e em repouso. O acesso interno é restrito a pessoas que precisam dele para manter o serviço.',
    ],
  },
  {
    id: 'retencao',
    title: 'Por quanto tempo guardamos',
    paragraphs: [
      'Guardamos seus dados enquanto sua conta estiver ativa. Quando você exclui a conta, apagamos seus dados em até 30 dias, exceto o que a lei nos obrigar a manter por mais tempo.',
    ],
  },
  {
    id: 'direitos',
    title: 'Seus direitos',
    paragraphs: ['Você pode, a qualquer momento:'],
    list: [
      'Confirmar se tratamos seus dados e acessá-los.',
      'Corrigir dados incompletos ou desatualizados.',
      'Exportar seus dados.',
      'Revogar consentimentos, como os lembretes.',
      'Excluir sua conta e todos os seus dados, direto em Perfil → Excluir conta ou na página Excluir conta deste site.',
    ],
  },
  {
    id: 'menores',
    title: 'Menores de idade',
    paragraphs: [
      'O Kash pode ser usado por pessoas a partir de 15 anos. Se você tem menos de 18 anos, recomendamos usar o app com o conhecimento de um responsável. Não coletamos dados além dos descritos aqui, independentemente da idade.',
    ],
  },
  {
    id: 'alteracoes',
    title: 'Alterações nesta política',
    paragraphs: ['Podemos atualizar esta política. Quando a mudança for relevante, avisaremos pelo app ou por e-mail antes de ela entrar em vigor.'],
  },
];

export const privacyContact = {
  title: 'Ficou com dúvida?',
  before: 'Fale com nosso encarregado de dados em',
  email: site.emails.privacy,
  after: 'Respondemos em até 15 dias.',
};

/** "2026-10-01" → "1 de outubro de 2026" (sem depender de Intl no servidor). */
export function formatLongDate(iso: string): string {
  const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} de ${months[(m ?? 1) - 1]} de ${y}`;
}
