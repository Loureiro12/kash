/**
 * Hooks derivados — ponte entre o store e os seletores puros do domínio.
 * As telas consomem estes hooks e nunca recalculam regras de negócio.
 */
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { activePlans, billSourceName, categoryColorMap, categoryUsage, billsSummary, budgetStatus, cardBills, cardDates, cardInvoices, cardUsage, categoryBreakdown, depositLabel, depositStatus, filterTxs, forecast, formatMoney, goalProgress, groupTxsByDay, invoiceView, monthDelta, monthIncome, monthlyHistory, monthSpent, monthTitle, openInvoices, previousMonthsSpent, sourceOptions, topCategoryTip, totalBalance, totalSaved, txTotals, txView, txViews, upcomingBills, type TxFilters } from '@kash/domain';
import { now } from '@/lib/clock';
import { useKashStore } from './useKashStore';

/** Categorias do usuário e o mapa nome → cor (para chips, listas e relatório). */
export function useCategories() {
  const categories = useKashStore((s) => s.categories);
  return useMemo(() => ({ categories, colors: categoryColorMap(categories), names: categories.map((c) => c.name) }), [categories]);
}

/** Categorias com a contagem de uso (tela de gerenciar). */
export function useCategoriesWithUsage() {
  const { categories, txs, bills, plans } = useKashStore(useShallow((s) => ({ categories: s.categories, txs: s.txs, bills: s.bills, plans: s.plans })));
  return useMemo(() => categories.map((c) => ({ ...c, usage: categoryUsage(c.name, { txs, bills, plans }) })), [categories, txs, bills, plans]);
}

/** Formata dinheiro respeitando "ocultar valores". */
export function useMoney() {
  const hidden = useKashStore((s) => s.settings.hideValues);
  return useMemo(() => (value: number) => formatMoney(value, hidden), [hidden]);
}

export function useHomeSummary() {
  const { accounts, txs, budget } = useKashStore(useShallow((s) => ({ accounts: s.accounts, txs: s.txs, budget: s.settings.monthlyBudget })));
  return useMemo(() => {
    const today = now();
    const spent = monthSpent(txs, today);
    return {
      totalBalance: totalBalance(accounts),
      spent,
      income: monthIncome(txs, today),
      budget,
      budgetStatus: budgetStatus(spent, budget),
    };
  }, [accounts, txs, budget]);
}

export function useRecentTxs(limit = 6) {
  const { txs, accounts, cards } = useKashStore(useShallow((s) => ({ txs: s.txs, accounts: s.accounts, cards: s.cards })));
  const { colors } = useCategories();
  return useMemo(() => {
    const today = now();
    return txViews(txs, accounts, cards, today, colors).slice(0, limit);
  }, [txs, accounts, cards, limit, colors]);
}

export function useUpcomingBills() {
  const bills = useKashStore((s) => s.bills);
  return useMemo(() => upcomingBills(bills), [bills]);
}

/** Faturas fechadas e não pagas, com nome do cartão e vencimento. */
export function useOpenInvoices() {
  const { invoices, cards } = useKashStore(useShallow((s) => ({ invoices: s.invoices, cards: s.cards })));
  return useMemo(() => openInvoices(invoices).map((i) => invoiceView(i, cards)), [invoices, cards]);
}

export function useBillsSummary() {
  const bills = useKashStore((s) => s.bills);
  return useMemo(() => billsSummary(bills), [bills]);
}

export function useForecast() {
  const { plans, bills, cards, accounts } = useKashStore(useShallow((s) => ({ plans: s.plans, bills: s.bills, cards: s.cards, accounts: s.accounts })));
  return useMemo(() => forecast(plans, bills, cards, now(), accounts), [plans, bills, cards, accounts]);
}

/** Contas fixas com o nome de onde são cobradas. */
export function useBillsView() {
  const { bills, cards, accounts } = useKashStore(useShallow((s) => ({ bills: s.bills, cards: s.cards, accounts: s.accounts })));
  return useMemo(() => bills.map((bill) => ({ bill, sourceName: billSourceName(bill, cards, accounts) })), [bills, cards, accounts]);
}

export function useCardsOverview() {
  const { cards, txs, plans, bills, invoices, accounts, selectedCardId } = useKashStore(
    useShallow((s) => ({ cards: s.cards, txs: s.txs, plans: s.plans, bills: s.bills, invoices: s.invoices, accounts: s.accounts, selectedCardId: s.ui.selectedCardId })),
  );
  const { colors } = useCategories();
  return useMemo(() => {
    const today = now();
    const list = cards.map((card) => ({ card, usage: cardUsage(card, txs, today), dates: cardDates(card, today) }));
    const selected = list.find((c) => c.card.id === selectedCardId) ?? list[0] ?? null;
    const selectedTxs = selected ? txs.filter((t) => t.sourceId === selected.card.id).map((t) => txView(t, accounts, cards, today, colors)) : [];
    const selectedPlans = selected ? activePlans(plans, selected.card.id, today) : [];
    const selectedBills = selected ? cardBills(bills, selected.card.id) : [];
    const selectedInvoices = selected ? cardInvoices(invoices, selected.card.id).map((i) => invoiceView(i, cards)) : [];
    return { list, selected, selectedTxs, selectedPlans, selectedBills, selectedInvoices };
  }, [cards, txs, plans, bills, invoices, accounts, selectedCardId, colors]);
}

export function useGoalsOverview() {
  const { goals, txs, accounts } = useKashStore(useShallow((s) => ({ goals: s.goals, txs: s.txs, accounts: s.accounts })));
  return useMemo(() => {
    const today = now();
    return {
      goals: goals.map((goal) => {
        const deposit = depositStatus(goal, today);
        return {
          goal,
          progress: goalProgress(goal),
          deposit,
          depositLabel: depositLabel(deposit, today),
          accountName: accounts.find((a) => a.id === goal.accountId)?.name ?? null,
        };
      }),
      totalSaved: totalSaved(goals),
      tip: topCategoryTip(txs, today),
    };
  }, [goals, txs, accounts]);
}

export function useReport() {
  const txs = useKashStore((s) => s.txs);
  const { colors } = useCategories();
  return useMemo(() => {
    const today = now();
    const previous = previousMonthsSpent(txs, today);
    return { spent: monthSpent(txs, today), history: monthlyHistory(txs, today, previous), delta: monthDelta(txs, today, previous), categories: categoryBreakdown(txs, today, colors) };
  }, [txs, colors]);
}

/** Lista completa de lançamentos de um mês, filtrada e agrupada por dia. */
export function useTransactionsList(filters: TxFilters) {
  const { txs, accounts, cards } = useKashStore(useShallow((s) => ({ txs: s.txs, accounts: s.accounts, cards: s.cards })));
  const { colors } = useCategories();
  return useMemo(() => {
    const today = now();
    const list = filterTxs(txs, filters, today);
    return { groups: groupTxsByDay(list, accounts, cards, today, colors), totals: txTotals(list), title: monthTitle(filters.monthOffset, today) };
  }, [txs, accounts, cards, filters, colors]);
}

export function useSourceOptions() {
  const { cards, accounts } = useKashStore(useShallow((s) => ({ cards: s.cards, accounts: s.accounts })));
  return useMemo(() => sourceOptions(cards, accounts), [cards, accounts]);
}
