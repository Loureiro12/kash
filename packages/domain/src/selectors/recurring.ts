import { toISODate } from '../dates';
import { round2 } from '../money';
import { normalizeTitle } from '../suggest';
import { isTransfer, type Bill, type ID, type Tx } from '../types';

/**
 * Cobranças recorrentes (assinaturas, mensalidades): gastos com a mesma descrição que voltam todo
 * mês, em dias parecidos e com valores próximos. Função pura sobre os lançamentos.
 */
export interface RecurringCharge {
  /** descrição normalizada (chave estável, usada para "Ignorar") */
  key: string;
  /** descrição como no lançamento mais recente */
  title: string;
  category: string;
  sourceId: ID;
  /** valor da cobrança mais recente */
  amount: number;
  /** dia do mês da cobrança mais recente (vira o vencimento da conta fixa) */
  dueDay: number;
  /** meses com cobrança nos últimos 6 */
  months: number;
  /** custo em 12 meses no valor atual */
  yearly: number;
  lastDate: string;
  /** lançamento deste mês, se já cobrou (a conta fixa nasce paga, ligada a ele) */
  thisMonthTxId: ID | null;
  /** o valor subiu na cobrança mais recente */
  priceChange: { from: number; to: number; month: string } | null;
  /** já existe conta fixa com esse nome */
  isBill: boolean;
}

/** quantos meses para trás olhar (além do atual) */
export const RECURRING_LOOKBACK_MONTHS = 6;
/** a última cobrança precisa ser destes últimos dias (mais que um mês: a fatura pode não ter sido importada ainda) */
export const RECURRING_ACTIVE_DAYS = 55;
/** mínimo de meses com cobrança para considerar recorrente */
export const RECURRING_MIN_MONTHS = 3;
/** diferença máxima entre os dias do mês das cobranças */
export const RECURRING_DAY_SPREAD = 7;
/** variação de valor aceita em torno da mediana (aumentos de preço cabem aqui) */
export const RECURRING_AMOUNT_TOLERANCE = 0.25;
/** aumento mínimo para avisar: 3% e R$ 1,00 */
const PRICE_MIN_PCT = 0.03;
const PRICE_MIN_ABS = 1;

const monthIndex = (iso: string) => Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7)) - 1;
const median = (values: number[]) => {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
};

function matchesBill(key: string, bills: readonly Bill[]): boolean {
  return bills.some((b) => {
    const name = normalizeTitle(b.name);
    if (!name) return false;
    if (name === key) return true;
    // "netflix" (conta fixa) × "netflix.com" (lançamento): um contém o outro, com 4+ letras
    return name.length >= 4 && key.length >= 4 && (key.includes(name) || name.includes(key));
  });
}

/**
 * Detecta cobranças recorrentes nos últimos meses. Regras:
 * - só gastos (sem entradas, transferências, pagamento de fatura e parcelas de compra parcelada);
 * - no máximo uma por mês com a mesma descrição (Uber e iFood várias vezes no mês ficam de fora);
 * - em pelo menos 3 meses dos últimos 6, sem pular mais de um mês seguido, e a última nos últimos 55 dias (dá folga para a fatura ainda não importada);
 * - em dias parecidos (até 7 dias de diferença) e com valores perto da mediana (±25%).
 * Ordena das mais caras para as mais baratas.
 */
export function detectRecurring(txs: readonly Tx[], bills: readonly Bill[], now: Date): RecurringCharge[] {
  const nowMonth = monthIndex(toISODate(now));
  const today = toISODate(now);
  const recentCut = toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - RECURRING_ACTIVE_DAYS));
  const groups = new Map<string, Tx[]>();
  for (const t of txs) {
    if (t.amount >= 0 || isTransfer(t) || t.planId || t.category === 'Fatura' || t.category === 'Entrada') continue;
    if (t.date > today || nowMonth - monthIndex(t.date) > RECURRING_LOOKBACK_MONTHS) continue;
    const key = normalizeTitle(t.title);
    if (key.length < 3) continue;
    const list = groups.get(key) ?? [];
    list.push(t);
    groups.set(key, list);
  }

  const out: RecurringCharge[] = [];
  for (const [key, list] of groups) {
    if (list.length < RECURRING_MIN_MONTHS) continue;
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
    const months = sorted.map((t) => monthIndex(t.date));
    // uma por mês
    if (new Set(months).size !== months.length) continue;
    // sem buracos grandes (no máximo um mês sem cobrança entre duas)
    if (months.some((m, i) => i > 0 && m - months[i - 1]! > 2)) continue;
    const last = sorted[sorted.length - 1]!;
    if (last.date < recentCut) continue;
    const days = sorted.map((t) => Number(t.date.slice(8, 10)));
    if (Math.max(...days) - Math.min(...days) > RECURRING_DAY_SPREAD) continue;
    const amounts = sorted.map((t) => Math.abs(t.amount));
    const med = median(amounts);
    if (amounts.some((a) => Math.abs(a - med) > med * RECURRING_AMOUNT_TOLERANCE)) continue;

    const amount = round2(Math.abs(last.amount));
    const prev = round2(Math.abs(sorted[sorted.length - 2]!.amount));
    const raised = amount - prev >= PRICE_MIN_ABS && amount >= prev * (1 + PRICE_MIN_PCT);
    out.push({
      key,
      title: last.title.trim(),
      category: last.category,
      sourceId: last.sourceId,
      amount,
      dueDay: Number(last.date.slice(8, 10)),
      months: months.length,
      yearly: round2(amount * 12),
      lastDate: last.date,
      thisMonthTxId: monthIndex(last.date) === nowMonth ? last.id : null,
      priceChange: raised ? { from: prev, to: amount, month: last.date.slice(0, 7) } : null,
      isBill: matchesBill(key, bills),
    });
  }
  return out.sort((a, b) => b.amount - a.amount);
}

/** sugestões para virar conta fixa: recorrentes que ainda não são conta fixa nem foram ignoradas */
export function recurringSuggestions(charges: readonly RecurringCharge[], dismissed: ReadonlySet<string>): RecurringCharge[] {
  return charges.filter((c) => !c.isBill && !dismissed.has(c.key));
}
