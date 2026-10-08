import { CATEGORY_COLORS, type CardGradientId, type CategoryName } from '@kash/domain';

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

/** Cores de categoria vêm do domínio (compartilhadas com o backend). */
export const categoryColors = CATEGORY_COLORS;
export type { CategoryName };

export interface CardGradient {
  id: CardGradientId;
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

/* ---------- cores personalizadas ---------- */

const INK_DARK = '#0B0C0E';
const INK_LIGHT = '#F3F4F0';

function rgbOf(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
}

const toHex = (rgb: number[]) => `#${rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase()}`;

/** Mistura a cor com branco (amount > 0) ou preto (amount < 0). */
export function shade(hex: string, amount: number): string {
  const target = amount >= 0 ? 255 : 0;
  const t = Math.abs(amount);
  return toHex(rgbOf(hex).map((c) => c + (target - c) * t));
}

/** Luminância relativa (WCAG), 0 = preto, 1 = branco. */
export function luminance(hex: string): number {
  const [r, g, b] = rgbOf(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Texto legível sobre a cor: escuro em cores claras, claro em cores escuras (maior contraste WCAG). */
export function readableInk(hex: string): string {
  const l = luminance(hex);
  const contrastDark = (l + 0.05) / (luminance(INK_DARK) + 0.05);
  const contrastLight = (luminance(INK_LIGHT) + 0.05) / (l + 0.05);
  return contrastDark >= contrastLight ? INK_DARK : INK_LIGHT;
}

/** Gradiente de cartão a partir de uma cor: um pouco mais clara no topo, mais escura embaixo. */
export function gradientFromColor(hex: string): readonly [string, string] {
  return [shade(hex, 0.18), shade(hex, -0.18)];
}

/** Aparência do cartão: cor personalizada (se houver) ou o gradiente pronto. */
export function cardAppearance(card: { gradientId: CardGradientId; color?: string }): { colors: readonly [string, string]; ink: string } {
  if (card.color) {
    const colors = gradientFromColor(card.color);
    return { colors, ink: readableInk(card.color) };
  }
  const preset = cardGradients.find((g) => g.id === card.gradientId) ?? cardGradients[0]!;
  return { colors: preset.colors, ink: preset.ink };
}

/** Sugestões do seletor de cor personalizada. */
export const colorSuggestions = ['#FF5A5F', '#FF8A3D', '#FFC83D', '#C6F432', '#3DDC97', '#2EC4B6', '#3D8BFF', '#6C5CE7', '#D98BFF', '#FF6FB5', '#8D6E63', '#5C6B7A'] as const;
