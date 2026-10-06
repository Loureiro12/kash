/**
 * Paleta Kash — fonte única de verdade para cores.
 * Tokens semânticos variam por tema; cores de categoria, gradientes e
 * cores "fixas" (ink sobre verde, overlay) são iguais nos dois temas.
 */

export type ThemeMode = 'dark' | 'light';

export interface SemanticColors {
  /** fundo das telas */
  bg: string;
  /** cards, inputs, tab bar */
  surface: string;
  /** trilhos de progresso, teclas, chips neutros */
  surface2: string;
  /** texto primário */
  text: string;
  /** texto secundário, ícones inativos */
  muted: string;
  /** bordas 1px */
  line: string;
  /** Verde Kash — fills (botão +, CTA, progresso) */
  accent: string;
  /** verde como texto/ícone (contraste em fundo claro) */
  accentText: string;
  /** texto sobre verde */
  onAccent: string;
  /** saídas, perigo */
  neg: string;
  /** chip "entrou", badges de parcela */
  posSoft: string;
  /** chip "saiu", botão excluir */
  negSoft: string;
  /** overlay de sheets */
  overlay: string;
}

export const darkColors: SemanticColors = {
  bg: '#0B0C0E',
  surface: '#16181C',
  surface2: '#1F2227',
  text: '#F3F4F0',
  muted: '#8B9099',
  line: 'rgba(255,255,255,0.08)',
  accent: '#C6F432',
  accentText: '#C6F432',
  onAccent: '#0B0C0E',
  neg: '#FF7A6B',
  posSoft: 'rgba(198,244,50,0.14)',
  negSoft: 'rgba(255,122,107,0.14)',
  overlay: 'rgba(0,0,0,0.5)',
};

export const lightColors: SemanticColors = {
  bg: '#F4F5EF',
  surface: '#FFFFFF',
  surface2: '#ECEEE6',
  text: '#14161A',
  muted: '#6B7079',
  line: 'rgba(0,0,0,0.08)',
  accent: '#C6F432',
  accentText: '#4E7A00',
  onAccent: '#0B0C0E',
  neg: '#D9442F',
  posSoft: 'rgba(141,196,20,0.16)',
  negSoft: 'rgba(217,68,47,0.12)',
  overlay: 'rgba(0,0,0,0.5)',
};

/** Cores que não mudam com o tema. */
export const staticColors = {
  brandGreen: '#C6F432',
  ink: '#0B0C0E',
  inkOnLight: '#F3F4F0',
  white: '#FFFFFF',
  /** trilho da barra dentro do card verde */
  trackOnAccent: 'rgba(11,12,14,0.18)',
} as const;

export const categoryColors = {
  Comida: '#FFB86B',
  Transporte: '#6BC5FF',
  Lazer: '#D98BFF',
  Mercado: '#7EE0A8',
  Assinaturas: '#FF8FB1',
  Outros: '#AAB2BF',
} as const;

export type CategoryName = keyof typeof categoryColors;

export interface CardGradient {
  id: 'green' | 'graphite' | 'blue' | 'purple';
  colors: readonly [string, string];
  ink: string;
}

export const cardGradients: readonly CardGradient[] = [
  { id: 'green', colors: ['#D7FF5C', '#9ED61E'], ink: '#0B0C0E' },
  { id: 'graphite', colors: ['#2B2F36', '#111317'], ink: '#F3F4F0' },
  { id: 'blue', colors: ['#8FD3FF', '#4C9BE8'], ink: '#0B0C0E' },
  { id: 'purple', colors: ['#E6A6FF', '#A85CE0'], ink: '#0B0C0E' },
];

export const avatarGradient: readonly [string, string] = ['#C6F432', '#5BB3FF'];

export const accountColors = ['#C6F432', '#6BC5FF', '#FFB86B', '#D98BFF', '#7EE0A8'] as const;

/** Converte `#RRGGBB` em `rgba(...)` com alpha. Usado para fundos suaves (ícone de categoria = cor + 15%). */
export function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
