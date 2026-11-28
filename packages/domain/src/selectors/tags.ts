import { addDays, toISODate } from '../dates';
import { round2 } from '../money';
import { isTransfer, type Settings, type Tx } from '../types';
import { UNKNOWN_CATEGORY_COLOR } from '../categories';

/** tamanho máximo de uma tag */
export const TAG_MAX = 30;

/** "  viagem   floripa " → "viagem floripa" (espaços); vazio → null */
export function cleanTag(raw: string | null | undefined): string | null {
  const t = (raw ?? '').replace(/\s+/g, ' ').trim().slice(0, TAG_MAX);
  return t || null;
}

const isSpend = (t: Tx) => t.amount < 0 && t.category !== 'Entrada' && t.category !== 'Fatura' && !isTransfer(t);
const key = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export interface TagTotal {
  tag: string;
  spent: number;
  income: number;
  count: number;
  /** primeiro e último lançamento (yyyy-mm-dd) */
  from: string;
  to: string;
}

/** Tags usadas, da mais recente para a mais antiga (mesma tag com caixa/acento diferente conta junto). */
export function tagTotals(txs: readonly Tx[]): TagTotal[] {
  const map = new Map<string, TagTotal>();
  for (const t of txs) {
    if (!t.tag || isTransfer(t)) continue;
    const k = key(t.tag);
    const cur = map.get(k) ?? { tag: t.tag, spent: 0, income: 0, count: 0, from: t.date, to: t.date };
    if (isSpend(t)) cur.spent += Math.abs(t.amount);
    else if (t.amount > 0) cur.income += t.amount;
    cur.count += 1;
    if (t.date < cur.from) cur.from = t.date;
    if (t.date > cur.to) {
      cur.to = t.date;
      cur.tag = t.tag; // grafia do lançamento mais recente
    }
    map.set(k, cur);
  }
  return [...map.values()].map((x) => ({ ...x, spent: round2(x.spent), income: round2(x.income) })).sort((a, b) => b.to.localeCompare(a.to));
}

export interface TagSummary extends TagTotal {
  /** dias entre o primeiro e o último lançamento (inclusive) */
  days: number;
  perDay: number;
  categories: { name: string; amount: number; pct: number; color: string }[];
  txs: Tx[];
}

/** Resumo de uma tag: total, por dia, por categoria e os lançamentos. null se a tag não tem lançamentos. */
export function tagSummary(txs: readonly Tx[], tag: string, colors: Readonly<Record<string, string>> = {}): TagSummary | null {
  const k = key(tag);
  const list = txs.filter((t) => t.tag && key(t.tag) === k && !isTransfer(t)).sort((a, b) => b.date.localeCompare(a.date));
  const total = tagTotals(list)[0];
  if (!total) return null;
  const days = Math.round((new Date(`${total.to}T12:00:00`).getTime() - new Date(`${total.from}T12:00:00`).getTime()) / 86_400_000) + 1;
  const byCat = new Map<string, number>();
  for (const t of list.filter(isSpend)) byCat.set(t.category, (byCat.get(t.category) ?? 0) + Math.abs(t.amount));
  const categories = [...byCat.entries()]
    .map(([name, amount]) => ({ name, amount: round2(amount), pct: total.spent > 0 ? Math.round((amount / total.spent) * 100) : 0, color: colors[name] ?? UNKNOWN_CATEGORY_COLOR }))
    .sort((a, b) => b.amount - a.amount);
  return { ...total, days, perDay: round2(total.spent / days), categories, txs: list };
}

/** Tag do modo viagem que vale hoje (null se desligado ou se já passou do último dia). */
export function activeTravelTag(settings: Pick<Settings, 'travelTag' | 'travelUntil'>, now: Date): string | null {
  const tag = cleanTag(settings.travelTag);
  if (!tag) return null;
  if (settings.travelUntil && settings.travelUntil < toISODate(now)) return null;
  return tag;
}

/** sugestão de fim do modo viagem: daqui a 7 dias */
export const defaultTravelUntil = (now: Date) => toISODate(addDays(now, 7));
