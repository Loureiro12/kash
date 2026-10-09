/**
 * Cores de cartões, contas e metas — mesmas paletas e regras do app mobile
 * (apps/mobile/src/design-system/tokens/colors.ts). Aqui viram strings CSS.
 */
import type { CardGradientId } from '@kash/domain';

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

export const accountColors = ['#C6F432', '#6BC5FF', '#FFB86B', '#D98BFF', '#7EE0A8'] as const;

/** Sugestões do seletor de cor personalizada (categorias, cartões e contas). */
export const colorSuggestions = ['#FF5A5F', '#FF8A3D', '#FFC83D', '#C6F432', '#3DDC97', '#2EC4B6', '#3D8BFF', '#6C5CE7', '#D98BFF', '#FF6FB5', '#8D6E63', '#5C6B7A'] as const;

export const avatarGradient = 'linear-gradient(135deg, #C6F432, #5BB3FF)';

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

export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = rgbOf(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Luminância relativa (WCAG). */
export function luminance(hex: string): number {
  const [r, g, b] = rgbOf(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Texto legível sobre a cor (o de maior contraste WCAG). */
export function readableInk(hex: string): string {
  const l = luminance(hex);
  const contrastDark = (l + 0.05) / (luminance(INK_DARK) + 0.05);
  const contrastLight = (luminance(INK_LIGHT) + 0.05) / (l + 0.05);
  return contrastDark >= contrastLight ? INK_DARK : INK_LIGHT;
}

const gradientCss = ([a, b]: readonly [string, string]) => `linear-gradient(135deg, ${a}, ${b})`;

/** Aparência do cartão: cor personalizada (se houver) ou o gradiente pronto. */
export function cardAppearance(card: { gradientId: CardGradientId; color?: string | null }): { background: string; ink: string } {
  if (card.color) return { background: gradientCss([shade(card.color, 0.18), shade(card.color, -0.18)]), ink: readableInk(card.color) };
  const preset = cardGradients.find((g) => g.id === card.gradientId) ?? cardGradients[0]!;
  return { background: gradientCss(preset.colors), ink: preset.ink };
}

export const presetBackground = (g: CardGradient) => gradientCss(g.colors);
