import { CATEGORY_COLORS, UNKNOWN_CATEGORY_COLOR } from '../categories';
import { monthName } from '../dates';
import { round2 } from '../money';
import { isTransfer, type Tx } from '../types';
import { txsOfMonth } from './transactions';

/** Saída que conta como gasto da categoria (mesma regra do Relatório: sem entrada, pagamento de fatura e transferência). */
const isSpend = (t: Tx) => t.amount < 0 && t.category !== 'Entrada' && t.category !== 'Fatura' && !isTransfer(t);

export interface CategoryMonth {
  /** 0 = mês atual, -1 = anterior… */
  offset: number;
  /** "out" */
  label: string;
  /** "outubro" */
  name: string;
  total: number;
  /** altura relativa da barra 6..100 */
  height: number;
}

export interface CategoryPlace {
  title: string;
  amount: number;
  count: number;
  /** % do gasto da categoria no mês */
  pct: number;
}

export interface CategoryDetail {
  category: string;
  color: string;
  /** últimos meses, do mais antigo ao atual */
  months: CategoryMonth[];
  selected: CategoryMonth;
  /** lançamentos da categoria no mês escolhido (mais recente primeiro) */
  txs: Tx[];
  count: number;
  /** gasto médio por lançamento */
  average: number;
  /** % de todos os gastos do mês */
  sharePct: number;
  /** comparação com o mês anterior ao escolhido */
  delta: { pct: number; message: string };
  /** onde mais gastou (agrupado pelo nome do lançamento) */
  places: CategoryPlace[];
}

/**
 * Detalhe de uma categoria, no estilo da Previsão: barras dos últimos meses (toque escolhe o mês),
 * total, comparação com o mês anterior, fatia dos gastos do mês, onde mais gastou e os lançamentos.
 */
export function categoryDetail(txs: Tx[], category: string, now: Date, offset = 0, options: { months?: number; colors?: Readonly<Record<string, string>>; topPlaces?: number } = {}): CategoryDetail {
  const count = options.months ?? 6;
  const selectedOffset = Math.min(0, Math.max(-(count - 1), offset));
  const spendOf = (o: number) => txsOfMonth(txs, o, now).filter(isSpend);
  const totalOf = (list: Tx[]) => round2(list.reduce((a, t) => a + Math.abs(t.amount), 0));

  const raw = Array.from({ length: count }, (_, i) => {
    const o = i - (count - 1);
    return { offset: o, label: monthName(o, now).slice(0, 3), name: monthName(o, now), total: totalOf(spendOf(o).filter((t) => t.category === category)) };
  });
  const max = Math.max(...raw.map((m) => m.total), 1);
  const months = raw.map((m) => ({ ...m, height: Math.max(6, Math.round((m.total / max) * 100)) }));
  const selected = months.find((m) => m.offset === selectedOffset)!;

  const monthSpend = spendOf(selectedOffset);
  const list = monthSpend.filter((t) => t.category === category);
  const monthTotal = totalOf(monthSpend);

  const prevTotal = totalOf(spendOf(selectedOffset - 1).filter((t) => t.category === category));
  const prevName = monthName(selectedOffset - 1, now);
  const pct = prevTotal > 0 ? Math.round(((selected.total - prevTotal) / prevTotal) * 100) : 0;
  const delta =
    prevTotal <= 0
      ? { pct: 0, message: selected.total > 0 ? `Sem gastos em ${prevName} pra comparar` : `Nada em ${category} em ${selected.name}` }
      : pct === 0
        ? { pct, message: `Igual a ${prevName}` }
        : { pct, message: pct < 0 ? `${-pct}% a menos que ${prevName}` : `${pct}% a mais que ${prevName}` };

  const byPlace = new Map<string, CategoryPlace>();
  for (const t of list) {
    const key = t.title.trim().toLowerCase();
    const cur = byPlace.get(key) ?? { title: t.title.trim(), amount: 0, count: 0, pct: 0 };
    cur.amount = round2(cur.amount + Math.abs(t.amount));
    cur.count += 1;
    byPlace.set(key, cur);
  }
  const places = [...byPlace.values()]
    .sort((a, b) => b.amount - a.amount || b.count - a.count)
    .slice(0, options.topPlaces ?? 5)
    .map((p) => ({ ...p, pct: selected.total > 0 ? Math.round((p.amount / selected.total) * 100) : 0 }));

  return {
    category,
    color: (options.colors ?? CATEGORY_COLORS)[category] ?? UNKNOWN_CATEGORY_COLOR,
    months,
    selected,
    txs: list,
    count: list.length,
    average: list.length ? round2(selected.total / list.length) : 0,
    sharePct: monthTotal > 0 ? Math.round((selected.total / monthTotal) * 100) : 0,
    delta,
    places,
  };
}
