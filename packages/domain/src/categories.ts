/**
 * Categorias e identidades visuais que fazem parte do modelo (cores por categoria,
 * gradientes de cartão). Vivem no domínio para o backend e o app compartilharem.
 */
/** Categorias com que todo usuário começa (o banco cria as mesmas no cadastro). */
export const DEFAULT_CATEGORIES = [
  { name: 'Comida', color: '#FFB86B' },
  { name: 'Transporte', color: '#6BC5FF' },
  { name: 'Lazer', color: '#D98BFF' },
  { name: 'Mercado', color: '#7EE0A8' },
  { name: 'Assinaturas', color: '#FF8FB1' },
  { name: 'Outros', color: '#AAB2BF' },
] as const;

/** Cores das categorias padrão; reserva quando a lista do usuário ainda não chegou. */
export const CATEGORY_COLORS: Readonly<Record<string, string>> = Object.fromEntries(DEFAULT_CATEGORIES.map((c) => [c.name, c.color]));

export type CategoryName = string;

/** Categorias de sistema: só aparecem em lançamentos e não podem ser criadas pelo usuário. */
export const SYSTEM_CATEGORIES = ['Entrada', 'Fatura', 'Transferência'] as const;
/** Categoria das duas pernas de uma transferência entre contas (não é gasto nem entrada). */
export const TRANSFER_CATEGORY = 'Transferência';
export const CATEGORY_NAME_MAX = 24;
/** Cor de uma categoria que não está mais na lista (ex.: lançamento restaurado depois de excluí-la). */
export const UNKNOWN_CATEGORY_COLOR = '#AAB2BF';

export const CARD_GRADIENT_IDS = ['green', 'graphite', 'blue', 'purple'] as const;
export type CardGradientId = (typeof CARD_GRADIENT_IDS)[number];

/** Verde Kash — usado em entradas e destaques. */
export const BRAND_GREEN = '#C6F432';
/** Cor neutra do pagamento de fatura nas listas. */
export const INVOICE_COLOR = '#AAB2BF';
/** Cor da transferência entre contas nas listas. */
export const TRANSFER_COLOR = '#6BC5FF';

/** Normaliza uma cor digitada para `#RRGGBB` maiúsculo (aceita "#abc", "abc", "aabbcc"); null se inválida. */
export function normalizeHexColor(input: string): string | null {
  const raw = input.trim().replace(/^#/, '');
  const full = /^[0-9a-f]{3}$/i.test(raw) ? raw.split('').map((ch) => ch + ch).join('') : raw;
  return /^[0-9a-f]{6}$/i.test(full) ? `#${full.toUpperCase()}` : null;
}

/** Mapa nome → cor a partir da lista do usuário. */
export function categoryColorMap(categories: ReadonlyArray<{ name: string; color: string }>): Record<string, string> {
  return Object.fromEntries(categories.map((c) => [c.name, c.color]));
}

/**
 * Valida o nome de uma categoria (criar ou renomear). Devolve a mensagem de erro ou null.
 * Compara sem diferenciar maiúsculas, como o banco.
 */
export function validateCategoryName(raw: string, categories: ReadonlyArray<{ id: string; name: string }>, editingId?: string): string | null {
  const name = raw.trim();
  if (!name) return 'Dê um nome pra categoria.';
  if (name.length > CATEGORY_NAME_MAX) return `Use até ${CATEGORY_NAME_MAX} caracteres.`;
  if (SYSTEM_CATEGORIES.some((s) => s.toLowerCase() === name.toLowerCase())) return `“${name}” é reservado pelo app.`;
  if (categories.some((c) => c.id !== editingId && c.name.toLowerCase() === name.toLowerCase())) return 'Já existe uma categoria com esse nome.';
  return null;
}

export interface CategoryUsage {
  txs: number;
  bills: number;
  plans: number;
  total: number;
}

/** Quantos registros usam a categoria (para avisar antes de excluir). */
export function categoryUsage(name: string, data: { txs: ReadonlyArray<{ category: string }>; bills: ReadonlyArray<{ category: string }>; plans: ReadonlyArray<{ category: string }> }): CategoryUsage {
  const txs = data.txs.filter((t) => t.category === name).length;
  const bills = data.bills.filter((b) => b.category === name).length;
  const plans = data.plans.filter((p) => p.category === name).length;
  return { txs, bills, plans, total: txs + bills + plans };
}
