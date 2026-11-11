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
    updatedAt: 'Atualizado em 10 de novembro de 2026',
    sections: [
      { heading: 'Quais dados coletamos', body: 'Nome, e-mail e os lançamentos que você cadastra. Se você entra com Apple ou Google, recebemos deles só o nome e o e-mail, nunca a senha. Não coletamos dados bancários nem localização.' },
      { heading: 'Como usamos', body: 'Apenas para mostrar seus relatórios, metas e lembretes dentro do app. Não vendemos nem compartilhamos com anunciantes.' },
      {
        heading: 'Importação com IA (opcional)',
        body: 'Quando você pede para o Kash ler o PDF de uma fatura e autoriza o uso da IA, o texto dos lançamentos é enviado à Anthropic, fornecedora do modelo de IA, só para identificar data, descrição, valor e parcelas. Antes do envio, o Kash tira do texto CPF, endereço, número do cartão, código de barras e o seu nome. O arquivo PDF e a senha dele não saem do seu aparelho. Arquivos OFX e CSV são lidos no aparelho, sem IA; se você autorizar, só a descrição das compras que o Kash ainda não reconhece (sem números longos, CPF, cartão e o seu nome; Pix e transferências não vão) é enviada para sugerir nomes e categorias.',
      },
      {
        heading: 'Dados de uso, falhas e desempenho',
        body: 'O app envia ao Google (Firebase Analytics, Crashlytics e Performance) quais telas e recursos são usados, relatórios de falha e tempos de carregamento, para manter o app estável e melhorá-lo. Nunca vão valores, nomes de lançamentos, seu e-mail ou seu nome; você é identificado só por um código interno, e não usamos identificador de anúncios. Desligue quando quiser em Perfil › Compartilhar dados de uso.',
      },
      { heading: 'Onde ficam', body: 'Em servidores criptografados no Brasil, conforme a LGPD.' },
      { heading: 'Seus direitos', body: 'Você pode exportar ou apagar seus dados quando quiser, direto no app.' },
    ],
  },
} satisfies Record<string, LegalDoc>;

export type LegalDocKey = keyof typeof LEGAL_DOCS;
