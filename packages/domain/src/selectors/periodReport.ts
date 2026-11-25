import { CATEGORY_COLORS, UNKNOWN_CATEGORY_COLOR } from '../categories';
import { addDays, MONTH_NAMES, parseISODate, startOfDay, toISODate } from '../dates';
import { formatBRL, round2 } from '../money';
import { isTransfer, type Tx } from '../types';
import type { CategorySlice } from './report';

/**
 * Relatórios por período (dia, semana, mês): quanto saiu, com o quê, comparado com o período
 * anterior e com a média, e como está o ritmo em relação ao limite mensal.
 * Mesmas regras de gasto do resto do app: saídas sem pagamento de fatura e sem transferências;
 * entradas sem transferências. A semana começa na segunda.
 */
export type ReportPeriod = 'day' | 'week' | 'month';

const WEEKDAYS_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const;
const WEEKDAYS_LONG = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'] as const;
const mon = (d: Date) => MONTH_NAMES[d.getMonth()]!.slice(0, 3);

const isSpend = (t: Tx) => t.amount < 0 && t.category !== 'Entrada' && t.category !== 'Fatura' && !isTransfer(t);
const isIncome = (t: Tx) => t.amount > 0 && !isTransfer(t);
const sum = (list: Tx[]) => round2(list.reduce((a, t) => a + Math.abs(t.amount), 0));
const daysInMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
const daysBetween = (a: Date, b: Date) => Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000);

/** início (incluso) e fim (excluso) do período `offset` (0 = atual, -1 = anterior…) */
export function periodRange(kind: ReportPeriod, offset: number, now: Date): { start: Date; end: Date } {
  const today = startOfDay(now);
  if (kind === 'day') {
    const start = addDays(today, offset);
    return { start, end: addDays(start, 1) };
  }
  if (kind === 'week') {
    const monday = addDays(today, -((today.getDay() + 6) % 7));
    const start = addDays(monday, offset * 7);
    return { start, end: addDays(start, 7) };
  }
  const start = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  return { start, end: new Date(start.getFullYear(), start.getMonth() + 1, 1) };
}

/** "Hoje" · "Ontem" · "qua, 19 nov" / "Esta semana" · "17 – 23 nov" / "Novembro" · "Novembro de 2025" */
function periodLabel(kind: ReportPeriod, offset: number, start: Date, end: Date, now: Date): { label: string; subtitle: string } {
  const last = addDays(end, -1);
  if (kind === 'day') {
    const label = offset === 0 ? 'Hoje' : offset === -1 ? 'Ontem' : `${WEEKDAYS_SHORT[start.getDay()]}, ${start.getDate()} ${mon(start)}`;
    return { label, subtitle: `${WEEKDAYS_LONG[start.getDay()]}, ${start.getDate()} de ${MONTH_NAMES[start.getMonth()]}` };
  }
  if (kind === 'week') {
    const range = start.getMonth() === last.getMonth() ? `${start.getDate()} – ${last.getDate()} ${mon(last)}` : `${start.getDate()} ${mon(start)} – ${last.getDate()} ${mon(last)}`;
    const label = offset === 0 ? 'Esta semana' : offset === -1 ? 'Semana passada' : range;
    return { label, subtitle: range };
  }
  const name = MONTH_NAMES[start.getMonth()]!;
  const cap = name[0]!.toUpperCase() + name.slice(1);
  const label = start.getFullYear() === now.getFullYear() ? cap : `${cap} de ${start.getFullYear()}`;
  return { label, subtitle: `1 – ${last.getDate()} ${mon(last)}` };
}

export interface PeriodBar {
  /** yyyy-mm-dd do dia da barra */
  date: string;
  /** "seg" (semana/dia) ou "17" (mês) */
  label: string;
  value: number;
  /** altura relativa 0..100 (0 = nada gasto) */
  height: number;
  /** o dia escolhido (visão Dia) ou hoje */
  selected: boolean;
  /** dia que ainda não chegou */
  future: boolean;
}

export interface PeriodBudget {
  /** limite do período: o mensal proporcional aos dias (dia = mês ÷ dias; semana = 7 dias) */
  limit: number;
  /** 0..100 */
  pct: number;
  /** positivo = sobra, negativo = passou */
  left: number;
  message: string;
  /** mês atual: quanto fecha no ritmo de agora */
  projected: number | null;
}

export interface PeriodReport {
  kind: ReportPeriod;
  offset: number;
  label: string;
  subtitle: string;
  /** yyyy-mm-dd */
  start: string;
  /** yyyy-mm-dd, último dia incluso */
  end: string;
  isCurrent: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  spent: number;
  income: number;
  /** entrou − saiu */
  net: number;
  /** quantidade de gastos */
  count: number;
  /** dias que já contam (no período atual, até hoje) */
  elapsedDays: number;
  /** gasto médio por dia no período (semana e mês) */
  perDay: number;
  /** comparação com o período anterior (no atual, até o mesmo ponto) */
  delta: { pct: number; message: string };
  /** média dos períodos completos anteriores (desde o primeiro lançamento); null sem histórico */
  average: { value: number; periods: number; message: string } | null;
  budget: PeriodBudget | null;
  /** dia: os 7 dias da semana · semana: os 7 dias · mês: cada dia */
  bars: PeriodBar[];
  /** dia em que mais gastou (semana e mês) */
  peakDay: { date: string; label: string; amount: number } | null;
  categories: CategorySlice[];
  /** maiores gastos do período */
  top: Tx[];
  /** tudo o que aconteceu no período (gastos, entradas e transferências), mais recente primeiro */
  txs: Tx[];
}

export interface PeriodReportOptions {
  monthlyBudget?: number;
  colors?: Readonly<Record<string, string>>;
  topCount?: number;
}

const inRange = (t: Tx, from: string, to: string) => t.date >= from && t.date < to;

/** "ontem" · "na semana passada" · "em outubro" (frase "Sem gastos … pra comparar") */
function comparisonIn(kind: ReportPeriod, offset: number, prevStart: Date): string {
  if (kind === 'day') return offset === 0 ? 'ontem' : 'no dia anterior';
  if (kind === 'week') return offset === 0 ? 'na semana passada' : 'na semana anterior';
  return `em ${MONTH_NAMES[prevStart.getMonth()]!}`;
}

function comparisonName(kind: ReportPeriod, offset: number, prevStart: Date): string {
  if (kind === 'day') return offset === 0 ? 'ontem' : 'o dia anterior';
  if (kind === 'week') return offset === 0 ? 'a semana passada' : 'a semana anterior';
  return MONTH_NAMES[prevStart.getMonth()]!;
}

const PERIOD_WORD: Record<ReportPeriod, string> = { day: 'dia', week: 'semana', month: 'mês' };
const BASELINE: Record<ReportPeriod, number> = { day: 30, week: 8, month: 6 };

export function periodReport(txs: Tx[], kind: ReportPeriod, offset: number, now: Date, options: PeriodReportOptions = {}): PeriodReport {
  const safeOffset = Math.min(0, offset);
  const { start, end } = periodRange(kind, safeOffset, now);
  const today = startOfDay(now);
  const from = toISODate(start);
  const to = toISODate(end);
  const isCurrent = safeOffset === 0;
  const { label, subtitle } = periodLabel(kind, safeOffset, start, end, now);

  const inPeriod = txs.filter((t) => inRange(t, from, to));
  const spendList = inPeriod.filter(isSpend);
  const spent = sum(spendList);
  const income = round2(inPeriod.filter(isIncome).reduce((a, t) => a + t.amount, 0));
  const totalDays = daysBetween(start, end);
  const elapsedDays = isCurrent ? Math.min(totalDays, daysBetween(start, today) + 1) : totalDays;

  // comparação: no período atual, só até o mesmo ponto do anterior (semana até quarta x semana passada até quarta)
  const prev = periodRange(kind, safeOffset - 1, now);
  const prevCut = isCurrent && kind !== 'day' ? addDays(prev.start, elapsedDays) : prev.end;
  const prevSpent = sum(txs.filter((t) => isSpend(t) && inRange(t, toISODate(prev.start), toISODate(prevCut < prev.end ? prevCut : prev.end))));
  const prevName = comparisonName(kind, safeOffset, prev.start);
  const partial = isCurrent && kind !== 'day' && elapsedDays < totalDays;
  const suffix = partial ? (kind === 'week' ? ` até ${WEEKDAYS_LONG[today.getDay()]}` : ` até o dia ${today.getDate()}`) : '';
  const pct = prevSpent > 0 ? Math.round(((spent - prevSpent) / prevSpent) * 100) : 0;
  const delta =
    prevSpent <= 0
      ? { pct: 0, message: spent > 0 ? `Sem gastos ${comparisonIn(kind, safeOffset, prev.start)} pra comparar` : 'Nenhum gasto por aqui' }
      : pct === 0
        ? { pct, message: `Igual a ${prevName}${suffix}` }
        : { pct, message: `${Math.abs(pct)}% ${pct < 0 ? 'a menos' : 'a mais'} que ${prevName}${suffix}` };

  // média dos períodos completos anteriores, só desde o primeiro lançamento (conta nova não dilui com zeros)
  const firstDate = txs.reduce<string | null>((min, t) => (isSpend(t) && (!min || t.date < min) ? t.date : min), null);
  let average: PeriodReport['average'] = null;
  if (firstDate) {
    const totals: number[] = [];
    for (let i = 1; i <= BASELINE[kind]; i++) {
      const r = periodRange(kind, safeOffset - i, now);
      if (toISODate(addDays(r.end, -1)) < firstDate) break;
      totals.push(sum(txs.filter((t) => isSpend(t) && inRange(t, toISODate(r.start), toISODate(r.end)))));
    }
    if (totals.length > 0) {
      const value = round2(totals.reduce((a, b) => a + b, 0) / totals.length);
      const compare = partial ? null : spent > value * 1.05 ? 'acima' : spent < value * 0.95 ? 'abaixo' : 'na';
      const message =
        compare === null
          ? `Sua média é ${formatBRL(value)} por ${PERIOD_WORD[kind]}`
          : compare === 'na'
            ? `Na sua média (${formatBRL(value)} por ${PERIOD_WORD[kind]})`
            : `${compare === 'acima' ? 'Acima' : 'Abaixo'} da sua média de ${formatBRL(value)} por ${PERIOD_WORD[kind]}`;
      average = { value, periods: totals.length, message };
    }
  }

  // limite: o mensal proporcional aos dias
  let budget: PeriodBudget | null = null;
  const monthly = options.monthlyBudget ?? 0;
  if (monthly > 0) {
    const dim = daysInMonth(start);
    const limit = round2(kind === 'month' ? monthly : kind === 'week' ? (monthly * 7) / dim : monthly / dim);
    const left = round2(limit - spent);
    const usedPct = Math.min(100, Math.round((spent / limit) * 100));
    const projected = kind === 'month' && isCurrent && elapsedDays > 0 ? round2((spent / elapsedDays) * totalDays) : null;
    const word = PERIOD_WORD[kind];
    let message: string;
    if (projected !== null) {
      message = projected <= limit ? `No ritmo atual, você fecha o mês em ${formatBRL(projected)}, dentro do limite` : `No ritmo atual, você fecha o mês em ${formatBRL(projected)}, ${formatBRL(projected - limit)} acima do limite`;
    } else if (left >= 0) {
      message = isCurrent ? `Sobram ${formatBRL(left)} do limite ${kind === 'week' ? 'da' : 'do'} ${word}` : `Ficou ${formatBRL(left)} abaixo do limite ${kind === 'week' ? 'da' : 'do'} ${word}`;
    } else {
      message = `Passou ${formatBRL(-left)} do limite ${kind === 'week' ? 'da' : 'do'} ${word}`;
    }
    budget = { limit, pct: usedPct, left, message, projected };
  }

  // barras: dia → a semana do dia; semana → seus 7 dias; mês → cada dia
  const barRange = kind === 'day' ? periodRange('week', 0, start) : { start, end };
  const barDays = daysBetween(barRange.start, barRange.end);
  const daily = Array.from({ length: barDays }, (_, i) => {
    const d = addDays(barRange.start, i);
    const iso = toISODate(d);
    return { d, iso, value: sum(txs.filter((t) => isSpend(t) && t.date === iso)) };
  });
  const max = Math.max(...daily.map((x) => x.value), 1);
  const todayISO = toISODate(today);
  const bars: PeriodBar[] = daily.map(({ d, iso, value }) => ({
    date: iso,
    label: kind === 'month' ? String(d.getDate()) : WEEKDAYS_SHORT[d.getDay()]!,
    value,
    height: value > 0 ? Math.max(6, Math.round((value / max) * 100)) : 0,
    selected: kind === 'day' ? iso === from : iso === todayISO,
    future: iso > todayISO,
  }));
  const peak = kind === 'day' ? null : daily.reduce<(typeof daily)[number] | null>((best, x) => (x.value > 0 && (!best || x.value > best.value) ? x : best), null);
  const peakDay = peak ? { date: peak.iso, label: `${WEEKDAYS_LONG[peak.d.getDay()]}, ${peak.d.getDate()} ${mon(peak.d)}`, amount: peak.value } : null;

  // por categoria
  const byCat = new Map<string, number>();
  for (const t of spendList) byCat.set(t.category, (byCat.get(t.category) ?? 0) + Math.abs(t.amount));
  const colors = options.colors ?? CATEGORY_COLORS;
  const categories: CategorySlice[] = [...byCat.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, amount]) => ({ name, color: colors[name] ?? UNKNOWN_CATEGORY_COLOR, amount: round2(amount), pct: spent > 0 ? Math.round((amount / spent) * 100) : 0 }));

  const top = [...spendList].sort((a, b) => a.amount - b.amount || (a.date < b.date ? 1 : -1)).slice(0, options.topCount ?? 5);
  const ordered = [...inPeriod].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const earliest = txs.reduce<string | null>((min, t) => (!min || t.date < min ? t.date : min), null);

  return {
    kind,
    offset: safeOffset,
    label,
    subtitle,
    start: from,
    end: toISODate(addDays(end, -1)),
    isCurrent,
    canGoBack: !!earliest && earliest < from,
    canGoForward: !isCurrent,
    spent,
    income,
    net: round2(income - spent),
    count: spendList.length,
    elapsedDays,
    perDay: elapsedDays > 0 ? round2(spent / elapsedDays) : 0,
    delta,
    average,
    budget,
    bars,
    peakDay,
    categories,
    top,
    txs: ordered,
  };
}

/** Deslocamento do período que contém `date` (para ir de uma barra da semana/mês ao dia). */
export function dayOffsetOf(date: string, now: Date): number {
  return daysBetween(startOfDay(now), parseISODate(date));
}
