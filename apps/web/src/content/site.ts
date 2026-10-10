/**
 * Configuração do site em um lugar só. Quando as lojas publicarem o app ou a versão web existir,
 * basta ligar a flag aqui: os botões, textos e o FAQ se ajustam sozinhos.
 */
export interface StoreLink {
  url: string;
  /** false enquanto o app não está publicado na loja: o botão aparece como "em breve" */
  available: boolean;
}

export const site = {
  name: 'Kash',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kash.app',
  locale: 'pt_BR',
  title: 'Kash — Sua grana, sem mistério',
  description:
    'App de finanças pessoais pra quem tá começando: cartões, parcelas, contas fixas e metas num lugar só. Lance um gasto em 3 toques e saiba quanto sobra até o fim do mês.',
  emails: {
    contact: 'contato@kash.app',
    privacy: 'privacidade@kash.app',
  },
  stores: {
    appStore: { url: 'https://apps.apple.com/app/id6820170870', available: false } satisfies StoreLink,
    googlePlay: { url: 'https://play.google.com/store/apps/details?id=com.andreloureiro.kash', available: false } satisfies StoreLink,
  },
  /** URL do Kash no navegador (login do app web); null esconde os links da landing */
  webApp: '/entrar' as string | null,
  /** página de termos de uso; null enquanto não existe */
  termsUrl: null as string | null,
  privacyUpdatedAt: '2026-10-10',
} as const;

export type Site = typeof site;
