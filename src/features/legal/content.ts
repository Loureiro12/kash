export interface LegalSection {
  heading: string;
  body: string;
}

export interface LegalDoc {
  title: string;
  updatedAt: string;
  sections: LegalSection[];
}

/** Conteúdo placeholder — substituir pelo texto jurídico real. */
export const LEGAL_DOCS = {
  terms: {
    title: 'Termos de uso',
    updatedAt: 'Atualizado em 1 de outubro de 2026',
    sections: [
      { heading: '1. O que é o Kash', body: 'O Kash é um app de organização financeira pessoal. Você lança seus gastos manualmente; não movimentamos dinheiro nem acessamos suas contas bancárias.' },
      { heading: '2. Sua conta', body: 'Você é responsável por manter sua senha segura. Menores de 18 anos podem usar o app com ciência de um responsável.' },
      { heading: '3. Uso aceitável', body: 'Não use o Kash para atividades ilegais ou para tentar acessar dados de outras pessoas.' },
      { heading: '4. Encerramento', body: 'Você pode excluir sua conta a qualquer momento em Perfil → Excluir conta. Todos os dados são apagados em até 30 dias.' },
    ],
  },
  privacy: {
    title: 'Privacidade',
    updatedAt: 'Atualizado em 1 de outubro de 2026',
    sections: [
      { heading: 'Quais dados coletamos', body: 'Nome, e-mail e os lançamentos que você cadastra. Não coletamos dados bancários nem localização.' },
      { heading: 'Como usamos', body: 'Apenas para mostrar seus relatórios, metas e lembretes dentro do app. Não vendemos nem compartilhamos com anunciantes.' },
      { heading: 'Onde ficam', body: 'Em servidores criptografados no Brasil, conforme a LGPD.' },
      { heading: 'Seus direitos', body: 'Você pode exportar ou apagar seus dados quando quiser, direto no app.' },
    ],
  },
} satisfies Record<string, LegalDoc>;

export type LegalDocKey = keyof typeof LEGAL_DOCS;
