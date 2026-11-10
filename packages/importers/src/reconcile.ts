import { isTransfer, type Tx } from '@kash/domain';
import { normalizeMerchant } from './normalize';
import { daysApart } from './transfers';

/**
 * Conferência com o que a pessoa já lançou: cada linha do arquivo procura o lançamento correspondente
 * (mesma origem, mesmo valor, data próxima; o nome desempata) e cada lançamento casa com no máximo uma
 * linha. "same" = é o mesmo gasto (vincula por padrão); "similar" = parecido, a pessoa confere.
 */

export type MatchStrength = 'same' | 'similar';

export interface ExistingMatch {
  txId: string;
  title: string;
  date: string;
  /** valor absoluto do lançamento no Kash */
  amount: number;
  strength: MatchStrength;
}

export interface MatchCandidate {
  key: string;
  date: string;
  /** valor absoluto da linha */
  amount: number;
  /** entrada (extrato); false = saída/compra */
  inflow: boolean;
  description: string;
  title: string;
}

const words = (s: string) =>
  new Set(
    normalizeMerchant(s)
      .split(' ')
      .filter((w) => w.length >= 3),
  );

/** 0..1: quanto os nomes têm em comum (palavras de 3+ letras, sem acento, sem maquininha). */
export function nameSimilarity(a: string, b: string): number {
  const wa = words(a);
  const wb = words(b);
  if (!wa.size || !wb.size) return 0;
  let common = 0;
  for (const w of wa) if ([...wb].some((x) => x === w || (Math.min(w.length, x.length) >= 5 && (x.includes(w) || w.includes(x))))) common += 1;
  return common / Math.min(wa.size, wb.size);
}

/** Lançamentos que podem casar com linhas do arquivo: da mesma origem, sem parcela e sem transferência. */
export function matchPool(txs: readonly Tx[], sourceId: string): Tx[] {
  return txs.filter((t) => t.sourceId === sourceId && !t.planId && !isTransfer(t));
}

/**
 * Melhor par para cada linha (um para um). Devolve o casamento por chave da linha.
 * Mesmo valor e até 3 dias = mesmo gasto; até 7 dias, ou valor quase igual com nome parecido = parecido.
 */
export function matchExisting(candidates: readonly MatchCandidate[], pool: readonly Tx[]): Map<string, ExistingMatch> {
  const pairs: { key: string; tx: Tx; score: number; strength: MatchStrength }[] = [];
  for (const c of candidates) {
    for (const t of pool) {
      if ((t.amount > 0) !== c.inflow) continue;
      const diff = Math.abs(Math.abs(t.amount) - c.amount);
      const days = daysApart(t.date, c.date);
      if (days > 7) continue;
      const sim = Math.max(nameSimilarity(c.description, t.title), nameSimilarity(c.title, t.title));
      const sameAmount = diff < 0.005;
      const closeAmount = diff <= Math.max(1, c.amount * 0.05);
      let strength: MatchStrength | null = null;
      if (sameAmount && days <= 3) strength = 'same';
      else if (sameAmount || (closeAmount && days <= 3 && sim > 0)) strength = 'similar';
      if (!strength) continue;
      pairs.push({ key: c.key, tx: t, strength, score: (strength === 'same' ? 100 : 50) - days * 5 + sim * 20 - diff });
    }
  }
  pairs.sort((a, b) => b.score - a.score);
  const byKey = new Map<string, ExistingMatch>();
  const usedTx = new Set<string>();
  for (const p of pairs) {
    if (byKey.has(p.key) || usedTx.has(p.tx.id)) continue;
    byKey.set(p.key, { txId: p.tx.id, title: p.tx.title, date: p.tx.date, amount: Math.abs(p.tx.amount), strength: p.strength });
    usedTx.add(p.tx.id);
  }
  return byKey;
}
