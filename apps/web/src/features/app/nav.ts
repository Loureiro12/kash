import type { IconName } from '@/components/app/Icon';

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  testID: string;
}

/** Rotas do app (o login fica fora de /app). */
export const routes = {
  login: '/entrar',
  signup: '/criar-conta',
  forgot: '/esqueci-senha',
  home: '/app',
  welcome: '/app/boas-vindas',
  transactions: '/app/lancamentos',
  cards: '/app/cartoes',
  accounts: '/app/contas',
  bills: '/app/contas-fixas',
  goals: '/app/metas',
  report: '/app/relatorio',
  forecast: '/app/previsao',
  profile: '/app/perfil',
  personal: '/app/perfil/dados',
  security: '/app/perfil/seguranca',
  budget: '/app/perfil/limite',
  categories: '/app/perfil/categorias',
  currency: '/app/perfil/moeda',
  help: '/app/perfil/ajuda',
  terms: '/app/termos',
  privacy: '/app/privacidade',
} as const;

/** Menu lateral (handoff + Lançamentos, a lista completa com busca e filtros). */
export const NAV: NavItem[] = [
  { href: routes.home, label: 'Início', icon: 'home', testID: 'nav-home' },
  { href: routes.transactions, label: 'Lançamentos', icon: 'list', testID: 'nav-transactions' },
  { href: routes.cards, label: 'Cartões', icon: 'cards', testID: 'nav-cards' },
  { href: routes.accounts, label: 'Contas bancárias', icon: 'wallet', testID: 'nav-accounts' },
  { href: routes.bills, label: 'Contas fixas', icon: 'bills', testID: 'nav-bills' },
  { href: routes.goals, label: 'Metas', icon: 'goals', testID: 'nav-goals' },
  { href: routes.report, label: 'Relatório', icon: 'report', testID: 'nav-report' },
  { href: routes.forecast, label: 'Previsão', icon: 'forecast', testID: 'nav-forecast' },
];

/** Item ativo: Início só no caminho exato; os demais também nas subpáginas. */
export function isActive(pathname: string, href: string): boolean {
  if (href === routes.home) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Atalho "N" abre Lançar gasto — mas não enquanto a pessoa digita ou usa um modificador. */
export function isNewTxShortcut(e: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'repeat'>, target: { tagName?: string; isContentEditable?: boolean } | null): boolean {
  if (e.key !== 'n' && e.key !== 'N') return false;
  if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return false;
  const tag = target?.tagName?.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) return false;
  return true;
}
