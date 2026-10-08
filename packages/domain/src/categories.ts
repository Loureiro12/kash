/**
 * Categorias e identidades visuais que fazem parte do modelo (cores por categoria,
 * gradientes de cartão). Vivem no domínio para o backend e o app compartilharem.
 */
export const CATEGORY_COLORS = {
  Comida: '#FFB86B',
  Transporte: '#6BC5FF',
  Lazer: '#D98BFF',
  Mercado: '#7EE0A8',
  Assinaturas: '#FF8FB1',
  Outros: '#AAB2BF',
} as const;

export type CategoryName = keyof typeof CATEGORY_COLORS;

export const CARD_GRADIENT_IDS = ['green', 'graphite', 'blue', 'purple'] as const;
export type CardGradientId = (typeof CARD_GRADIENT_IDS)[number];

/** Verde Kash — usado em entradas e destaques. */
export const BRAND_GREEN = '#C6F432';
/** Cor neutra do pagamento de fatura nas listas. */
export const INVOICE_COLOR = '#AAB2BF';

/** Normaliza uma cor digitada para `#RRGGBB` maiúsculo (aceita "#abc", "abc", "aabbcc"); null se inválida. */
export function normalizeHexColor(input: string): string | null {
  const raw = input.trim().replace(/^#/, '');
  const full = /^[0-9a-f]{3}$/i.test(raw) ? raw.split('').map((ch) => ch + ch).join('') : raw;
  return /^[0-9a-f]{6}$/i.test(full) ? `#${full.toUpperCase()}` : null;
}
