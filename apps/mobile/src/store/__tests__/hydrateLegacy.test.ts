import { act } from '@testing-library/react-native';
import { useKashStore } from '@/store';

it('snapshot persistido por versão antiga (sem categorias) não quebra a hidratação', async () => {
  useKashStore.getState().reset();
  const before = useKashStore.getState().categories;
  const s = useKashStore.getState();
  const legacy = { user: s.user, settings: s.settings, lastRolloverMonth: s.lastRolloverMonth, accounts: s.accounts, cards: s.cards, cardUsage: {}, txs: s.txs, plans: s.plans, bills: s.bills, goals: s.goals, invoices: s.invoices };
  await act(async () => useKashStore.getState().hydrateFromServer(legacy as never));
  expect(useKashStore.getState().categories).toEqual(before);
});
