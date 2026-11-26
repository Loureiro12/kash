import { addDays, toISODate } from '../dates';
import { formatBRL, round2 } from '../money';
import { isTransfer, type Settings, type Tx } from '../types';
import { budgetSplit, type BudgetPart } from './budget';
import { periodRange, periodReport } from './periodReport';
import type { Reminder } from './reminders';

/**
 * Alertas de gastos: avisos sobre o que já aconteceu (não sobre vencimentos). Funções puras:
 * o app decide quando mostrar e guarda os ids já avisados (cada id é avisado uma vez só).
 */
export type SpendingAlertKind = 'budget-80' | 'budget-100' | 'pace' | 'category';

export interface SpendingAlert {
  /** estável por mês/semana: o mesmo alerta nunca é mostrado duas vezes */
  id: string;
  kind: SpendingAlertKind;
  title: string;
  body: string;
  route: string;
  /** maior = mais importante; quando há vários, o app mostra o mais importante */
  priority: number;
  /** ids que este alerta torna desnecessários (ex.: 100% cobre o de 80%) */
  supersedes: string[];
}

export interface SpendingAlertInput {
  txs: readonly Tx[];
  cardIds: readonly string[];
  settings: Pick<Settings, 'monthlyBudget' | 'cardBudget'>;
}

/** porcentagem do limite que dispara o primeiro aviso */
export const BUDGET_WARN_PCT = 80;
/** ritmo: só a partir deste dia do mês (antes disso a projeção oscila demais) */
export const PACE_FROM_DAY = 8;
/** categoria: últimos 7 dias pelo menos 50% acima da média semanal… */
export const CATEGORY_RATIO = 1.5;
/** …e pelo menos este valor acima (evita alarme por R$ 10) */
export const CATEGORY_MIN_EXCESS = 50;
/** resumo semanal: domingo às 19h */
export const WEEKLY_SUMMARY_HOUR = 19;

const isSpend = (t: Tx) => t.amount < 0 && t.category !== 'Entrada' && t.category !== 'Fatura' && !isTransfer(t);
const monthOf = (now: Date) => toISODate(now).slice(0, 7);
const daysInMonth = (now: Date) => new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
/** segunda-feira da semana de `d` (yyyy-mm-dd), para ids semanais */
const weekKey = (d: Date) => toISODate(periodRange('week', 0, d).start);

function budgetAlerts(part: BudgetPart, scope: 'total' | 'card' | 'rest', month: string, now: Date): SpendingAlert[] {
  if (part.budget <= 0) return [];
  const pct = (part.spent / part.budget) * 100;
  const where = scope === 'card' ? ' do cartão' : scope === 'rest' ? ' fora do cartão' : '';
  const label = scope === 'card' ? 'limite do cartão' : scope === 'rest' ? 'limite fora do cartão' : 'limite do mês';
  const base = `budget:${scope}:${month}`;
  const daysLeft = daysInMonth(now) - now.getDate();
  const weight = scope === 'total' ? 0 : -1; // o total vem antes das partes
  if (pct >= 100) {
    return [
      {
        id: `${base}:100`,
        kind: 'budget-100',
        title: `Você passou o ${label}`,
        body: `${formatBRL(part.spent)} de ${formatBRL(part.budget)}${where}: ${formatBRL(round2(part.spent - part.budget))} acima${daysLeft > 0 ? `, e faltam ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}` : ''}. Veja onde dá pra segurar.`,
        route: '/report?periodo=mes',
        priority: 40 + weight,
        supersedes: [`${base}:80`],
      },
    ];
  }
  if (pct >= BUDGET_WARN_PCT) {
    return [
      {
        id: `${base}:80`,
        kind: 'budget-80',
        title: `Você já usou ${Math.floor(pct)}% do ${label}`,
        body: `Sobram ${formatBRL(round2(part.budget - part.spent))}${where}${daysLeft > 0 ? ` para ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}: uns ${formatBRL(round2((part.budget - part.spent) / daysLeft))} por dia` : ''}.`,
        route: '/report?periodo=mes',
        priority: 30 + weight,
        supersedes: [],
      },
    ];
  }
  return [];
}

/** projeção do mês pelo ritmo até hoje: avisa uma vez por semana se ela passa do limite */
function paceAlert(part: BudgetPart, month: string, now: Date): SpendingAlert | null {
  const day = now.getDate();
  const total = daysInMonth(now);
  if (part.budget <= 0 || day < PACE_FROM_DAY || day > total - 3) return null;
  if ((part.spent / part.budget) * 100 >= BUDGET_WARN_PCT) return null; // aí o aviso de 80% já cuida
  const projected = round2((part.spent / day) * total);
  if (projected <= part.budget * 1.05) return null;
  const perDay = round2((part.budget - part.spent) / (total - day));
  return {
    id: `pace:${month}:${weekKey(now)}`,
    kind: 'pace',
    title: `No ritmo atual, o mês fecha em ${formatBRL(projected)}`,
    body: `É ${formatBRL(round2(projected - part.budget))} acima do limite de ${formatBRL(part.budget)}. Gastando até ${formatBRL(perDay)} por dia, você fecha no verde.`,
    route: '/report?periodo=mes',
    priority: 20,
    supersedes: [],
  };
}

/** categoria com os últimos 7 dias bem acima da média semanal das 4 semanas anteriores */
function categoryAlert(txs: readonly Tx[], now: Date): SpendingAlert | null {
  const today = toISODate(now);
  const weekStart = toISODate(addDays(now, -6));
  const histStart = toISODate(addDays(now, -34));
  const recent = new Map<string, number>();
  const history = new Map<string, { total: number; weeks: Set<number> }>();
  for (const t of txs) {
    if (!isSpend(t) || t.date > today || t.date < histStart) continue;
    const v = Math.abs(t.amount);
    if (t.date >= weekStart) recent.set(t.category, (recent.get(t.category) ?? 0) + v);
    else {
      const h = history.get(t.category) ?? { total: 0, weeks: new Set<number>() };
      h.total += v;
      // em qual das 4 semanas anteriores caiu (0 = a mais recente)
      const back = Math.round((new Date(`${today}T12:00:00`).getTime() - new Date(`${t.date}T12:00:00`).getTime()) / 86_400_000);
      h.weeks.add(Math.min(3, Math.floor((back - 7) / 7)));
      history.set(t.category, h);
    }
  }
  let best: { category: string; recent: number; avg: number } | null = null;
  for (const [category, value] of recent) {
    const h = history.get(category);
    // precisa de histórico: gasto na categoria em pelo menos 2 das 4 semanas anteriores
    if (!h || h.weeks.size < 2) continue;
    const avg = h.total / 4;
    if (value < avg * CATEGORY_RATIO || value - avg < CATEGORY_MIN_EXCESS) continue;
    if (!best || value - avg > best.recent - best.avg) best = { category, recent: value, avg };
  }
  if (!best) return null;
  const pct = Math.round((best.recent / best.avg - 1) * 100);
  return {
    id: `category:${best.category}:${weekKey(now)}`,
    kind: 'category',
    title: `${best.category}: ${pct}% acima do normal`,
    body: `${formatBRL(round2(best.recent))} nos últimos 7 dias; costuma ser uns ${formatBRL(round2(best.avg))} por semana.`,
    route: `/category/${encodeURIComponent(best.category)}`,
    priority: 10,
    supersedes: [],
  };
}

/**
 * Alertas que valem agora, do mais importante para o menos. O app filtra os já avisados e mostra
 * no máximo um por vez (os que um alerta torna desnecessários vão junto como avisados).
 */
export function spendingAlerts(input: SpendingAlertInput, now: Date): SpendingAlert[] {
  const month = monthOf(now);
  const split = budgetSplit(input.txs, input.cardIds, input.settings, now);
  const out: SpendingAlert[] = [...budgetAlerts(split.total, 'total', month, now)];
  if (split.card) out.push(...budgetAlerts(split.card, 'card', month, now));
  if (split.rest) out.push(...budgetAlerts(split.rest, 'rest', month, now));
  const pace = paceAlert(split.total, month, now);
  if (pace) out.push(pace);
  const category = categoryAlert(input.txs, now);
  if (category) out.push(category);
  return out.sort((a, b) => b.priority - a.priority);
}

/**
 * Escolhe o que mostrar: o alerta mais importante ainda não avisado, e os ids a marcar como avisados
 * (ele, os que ele cobre e, no primeiro uso, os de menor prioridade, para não chegar uma fila de avisos).
 */
export function nextSpendingAlert(alerts: readonly SpendingAlert[], alreadySent: ReadonlySet<string>): { alert: SpendingAlert | null; markSent: string[] } {
  const fresh = alerts.filter((a) => !alreadySent.has(a.id));
  const alert = fresh[0] ?? null;
  if (!alert) return { alert: null, markSent: [] };
  // os demais desta rodada ficam como avisados: um aviso por vez, sem fila
  const markSent = [...new Set([alert.id, ...alert.supersedes, ...fresh.slice(1).map((a) => a.id)])];
  return { alert, markSent };
}

/**
 * Resumo da semana para domingo às 19h, com os números de agora (o app reagenda sempre que os
 * dados mudam). Nada se a semana não teve gasto ou se o domingo 19h já passou.
 */
export function weeklySummaryReminder(input: SpendingAlertInput, now: Date): Reminder | null {
  // o fim do período é exclusivo (a segunda seguinte): o domingo é o dia anterior
  const sunday = addDays(periodRange('week', 0, now).end, -1);
  const at = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate(), WEEKLY_SUMMARY_HOUR, 0, 0, 0);
  if (at.getTime() <= now.getTime()) return null;
  const week = periodReport([...input.txs], 'week', 0, now, { monthlyBudget: input.settings.monthlyBudget, topCount: 1 });
  if (week.spent <= 0) return null;
  const top = week.categories[0];
  const left = budgetSplit(input.txs, input.cardIds, input.settings, now).total;
  const parts = [
    top ? `Mais em ${top.name} (${formatBRL(top.amount)}).` : '',
    left.budget > 0 ? (left.status.left > 0 ? `Sobram ${formatBRL(left.status.left)} no limite do mês.` : `O mês já passou ${formatBRL(-left.status.left)} do limite.`) : '',
  ].filter(Boolean);
  return {
    id: `weekly:${toISODate(sunday)}`,
    kind: 'weekly-summary',
    title: `Sua semana: ${formatBRL(week.spent)} em gastos`,
    body: parts.join(' ') || 'Toque para ver o resumo da semana.',
    at: `${toISODate(at)}T${String(WEEKLY_SUMMARY_HOUR).padStart(2, '0')}:00`,
    route: '/report?periodo=semana',
  };
}
