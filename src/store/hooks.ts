/**
 * Hooks derivados — ponte entre o store e os seletores puros do domínio.
 * As telas consomem estes hooks e nunca recalculam regras de negócio.
 */
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { formatMoney } from '@/domain/money';
import {
  activePlans,
  billsSummary,
  budgetStatus,
  cardDates,
  cardUsage,
  categoryBreakdown,
  forecast,
  goalProgress,
  monthDelta,
  monthIncome,
  monthSpent,
  monthlyHistory,
  sourceOptions,
  topCategoryTip,
  totalBalance,
  totalSaved,
  txView,
  upcomingBills,
} from '@/domain/selectors';
import { now } from '@/lib/clock';
import { useKashStore } from './useKashStore';

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
  return useMemo(() => {
    const today = now();
    return txs.slice(0, limit).map((t) => txView(t, accounts, cards, today));
  }, [txs, accounts, cards, limit]);
}

export function useUpcomingBills() {
  const bills = useKashStore((s) => s.bills);
  return useMemo(() => upcomingBills(bills), [bills]);
}

export function useBillsSummary() {
  const bills = useKashStore((s) => s.bills);
  return useMemo(() => billsSummary(bills), [bills]);
}

export function useForecast() {
  const { plans, bills, cards } = useKashStore(useShallow((s) => ({ plans: s.plans, bills: s.bills, cards: s.cards })));
  return useMemo(() => forecast(plans, bills, cards, now()), [plans, bills, cards]);
}

export function useCardsOverview() {
  const { cards, txs, plans, accounts, selectedCardId } = useKashStore(
    useShallow((s) => ({ cards: s.cards, txs: s.txs, plans: s.plans, accounts: s.accounts, selectedCardId: s.ui.selectedCardId })),
  );
  return useMemo(() => {
    const today = now();
    const list = cards.map((card) => ({ card, usage: cardUsage(card, txs), dates: cardDates(card, today) }));
    const selected = list.find((c) => c.card.id === selectedCardId) ?? list[0] ?? null;
    const selectedTxs = selected ? txs.filter((t) => t.sourceId === selected.card.id).map((t) => txView(t, accounts, cards, today)) : [];
    const selectedPlans = selected ? activePlans(plans, selected.card.id, today) : [];
    return { list, selected, selectedTxs, selectedPlans };
  }, [cards, txs, plans, accounts, selectedCardId]);
}

export function useGoalsOverview() {
  const { goals, txs } = useKashStore(useShallow((s) => ({ goals: s.goals, txs: s.txs })));
  return useMemo(
    () => ({
      goals: goals.map((goal) => ({ goal, progress: goalProgress(goal) })),
      totalSaved: totalSaved(goals),
      tip: topCategoryTip(txs, now()),
    }),
    [goals, txs],
  );
}

export function useReport() {
  const txs = useKashStore((s) => s.txs);
  return useMemo(() => {
    const today = now();
    return { spent: monthSpent(txs, today), history: monthlyHistory(txs, today), delta: monthDelta(txs, today), categories: categoryBreakdown(txs, today) };
  }, [txs]);
}

export function useSourceOptions() {
  const { cards, accounts } = useKashStore(useShallow((s) => ({ cards: s.cards, accounts: s.accounts })));
  return useMemo(() => sourceOptions(cards, accounts), [cards, accounts]);
}
