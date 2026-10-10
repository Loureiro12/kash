/**
 * Projeções das telas a partir do snapshot — ponte entre os dados e os seletores puros do domínio.
 * As telas consomem estas funções (via hooks) e nunca recalculam regra de negócio.
 */
import {
  activePlans,
  billSourceName,
  billsSummary,
  billsTotal,
  budgetStatus,
  cardBills,
  cardDates,
  cardInvoices,
  cardUsage,
  categoryBreakdown,
  categoryColorMap,
  categoryUsage,
  depositLabel,
  depositStatus,
  filterTxs,
  forecast,
  forecastHeights,
  goalProgress,
  groupTxsByDay,
  invoiceView,
  monthDelta,
  monthIncome,
  monthlyHistory,
  monthName,
  monthSpent,
  monthTitle,
  openInvoices,
  previousMonthsSpent,
  sourceOptions,
  topCategoryTip,
  totalBalance,
  totalSaved,
  txTotals,
  txView,
  txViews,
  upcomingBills,
  type TxFilters,
} from '@kash/domain';
import type { KashSnapshot } from '@kash/supabase-client';

type Snap = KashSnapshot;

export const categoryColors = (s: Pick<Snap, 'categories'>) => categoryColorMap(s.categories);

export function homeView(s: Snap, now: Date) {
  const spent = monthSpent(s.txs, now);
  const colors = categoryColors(s);
  const months = forecast(s.plans, s.bills, s.cards, now, s.accounts);
  return {
    totalBalance: totalBalance(s.accounts),
    income: monthIncome(s.txs, now),
    spent,
    budget: s.settings.monthlyBudget,
    budgetStatus: budgetStatus(spent, s.settings.monthlyBudget),
    forecastHeights: forecastHeights(months, 10),
    nextMonth: months[0] ?? null,
    recent: txViews(s.txs, s.accounts, s.cards, now, colors).slice(0, 8),
    bills: upcomingBills(s.bills),
    invoices: openInvoices(s.invoices).map((i) => invoiceView(i, s.cards)),
    goals: s.goals.map((g) => ({ goal: g, progress: goalProgress(g) })),
  };
}

export function cardsView(s: Snap, selectedId: string | null, now: Date) {
  const colors = categoryColors(s);
  const list = s.cards.map((card) => ({ card, usage: cardUsage(card, s.txs, now), dates: cardDates(card, now) }));
  const selected = list.find((c) => c.card.id === selectedId) ?? list[0] ?? null;
  const id = selected?.card.id;
  const invoices = id ? cardInvoices(s.invoices, id).map((i) => invoiceView(i, s.cards)) : [];
  return {
    list,
    selected,
    txs: id ? s.txs.filter((t) => t.sourceId === id).map((t) => ({ tx: t, view: txView(t, s.accounts, s.cards, now, colors) })) : [],
    plans: id ? activePlans(s.plans, id, now) : [],
    bills: id ? cardBills(s.bills, id) : [],
    openInvoice: invoices.find((i) => !i.paid) ?? null,
    lastPaidInvoice: invoices.find((i) => i.paid) ?? null,
  };
}

export function billsView(s: Snap) {
  return {
    summary: { ...billsSummary(s.bills), total: billsTotal(s.bills) },
    bills: s.bills.map((bill) => ({ bill, sourceName: billSourceName(bill, s.cards, s.accounts) })),
  };
}

export function goalsView(s: Snap, now: Date) {
  return {
    goals: s.goals.map((goal) => {
      const deposit = depositStatus(goal, now);
      return { goal, progress: goalProgress(goal), deposit, depositLabel: depositLabel(deposit, now), accountName: s.accounts.find((a) => a.id === goal.accountId)?.name ?? null };
    }),
    totalSaved: totalSaved(s.goals),
    tip: topCategoryTip(s.txs, now),
  };
}

export function reportView(s: Snap, now: Date) {
  const previous = previousMonthsSpent(s.txs, now);
  return {
    monthName: monthName(0, now),
    spent: monthSpent(s.txs, now),
    history: monthlyHistory(s.txs, now, previous),
    delta: monthDelta(s.txs, now, previous),
    categories: categoryBreakdown(s.txs, now, categoryColors(s)),
  };
}

export function forecastView(s: Snap, now: Date) {
  const months = forecast(s.plans, s.bills, s.cards, now, s.accounts);
  return { months, heights: forecastHeights(months, 8), budget: s.settings.monthlyBudget };
}

export function transactionsView(s: Snap, filters: TxFilters, now: Date, search = '') {
  const q = search.trim().toLowerCase();
  const list = filterTxs(s.txs, filters, now).filter((t) => !q || t.title.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
  const byId = new Map(list.map((t) => [t.id, t]));
  return {
    groups: groupTxsByDay(list, s.accounts, s.cards, now, categoryColors(s)).map((g) => ({ ...g, txs: g.items.map((v) => byId.get(v.id)!) })),
    totals: txTotals(list),
    title: monthTitle(filters.monthOffset, now),
  };
}

export const sourcesView = (s: Pick<Snap, 'cards' | 'accounts'>) => sourceOptions(s.cards, s.accounts);

export function categoriesWithUsage(s: Snap) {
  return s.categories.map((c) => ({ ...c, usage: categoryUsage(c.name, { txs: s.txs, bills: s.bills, plans: s.plans }) }));
}
