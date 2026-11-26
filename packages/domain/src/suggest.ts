import type { ID, Tx } from './types';

/** "Pão de Açúcar " → "pao de acucar" (compara descrições sem caixa, acento nem espaços extras) */
export function normalizeTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export interface HistorySuggestion {
  category: string;
  sourceId: ID;
}

/**
 * Categoria e origem do gasto mais recente com a mesma descrição (ex.: "ifood" → Comida, Nubank).
 * Ignora transferências, pagamentos de fatura e entradas. Precisa de 3+ letras para não chutar cedo.
 */
export function suggestFromHistory(txs: readonly Tx[], note: string): HistorySuggestion | null {
  const key = normalizeTitle(note);
  if (key.length < 3) return null;
  let best: Tx | null = null;
  for (const t of txs) {
    if (t.amount >= 0 || t.transferId || t.category === 'Fatura' || t.category === 'Transferência') continue;
    if (normalizeTitle(t.title) !== key) continue;
    if (!best || t.date > best.date) best = t;
  }
  return best ? { category: best.category, sourceId: best.sourceId } : null;
}
