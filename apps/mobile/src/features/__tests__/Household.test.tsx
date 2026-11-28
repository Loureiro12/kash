import { act, fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import { Alert, Share } from 'react-native';
import * as api from '@kash/supabase-client';
import type { Account, Household, Tx } from '@kash/domain';
import { __resetRemoteActionsForTests, installRemoteActions } from '@/data/remoteActions';
import { SharedAccountScreen } from '@/features/household/SharedAccountScreen';
import { TxRow } from '@/features/transactions/TxRow';
import { setClock } from '@/lib/clock';
import type { KashSnapshot } from '@kash/supabase-client';
import { useKashStore } from '@/store';
import { renderWithTheme } from '@/test/render';

jest.mock('@/data/source', () => ({ DATA_SOURCE: 'remote' }));
jest.mock('@/services/telemetry', () => ({ track: jest.fn() }));
const mocked = api as jest.Mocked<typeof api>;

const ANA = 'u-ana';
const BRUNO = 'u-bruno';
const household = (over: Partial<Household['members'][number]> = {}): Household => ({
  id: 'h1',
  name: 'Nossa conta',
  invite: null,
  members: [
    { userId: ANA, name: 'Ana Souza', role: 'owner', sharePersonal: false, viewScope: 'all', notifyScope: 'shared', notifyValues: true, ...over },
    { userId: BRUNO, name: 'Bruno Lima', role: 'member', sharePersonal: true, viewScope: 'all', notifyScope: 'shared', notifyValues: true },
  ],
});
const acc = (id: string, name: string, ownerId: string, householdId: string | null = null): Account => ({ id, name, kind: 'Conta corrente', balance: 100, color: '#C6F432', ownerId, householdId });
const tx = (id: string, title: string, sourceId: string, ownerId: string, householdId: string | null = null): Tx => ({ id, title, category: 'Comida', amount: -10, date: '2026-11-28', sourceId, sourceType: 'account', ownerId, householdId });

function snapshot(h: Household | null): KashSnapshot {
  const s = useKashStore.getState();
  return {
    user: s.user,
    settings: s.settings,
    lastRolloverMonth: '2026-11',
    categories: s.categories,
    accounts: [acc('a-ana', 'Pessoal Ana', ANA), acc('a-casa', 'Casa', ANA, 'h1'), acc('a-bruno', 'Pessoal Bruno', BRUNO)],
    cards: [],
    cardUsage: {},
    txs: [tx('t-ana', 'Café', 'a-ana', ANA), tx('t-casa', 'Mercado', 'a-casa', BRUNO, 'h1'), tx('t-bruno', 'Cinema', 'a-bruno', BRUNO)],
    plans: [],
    bills: [],
    goals: [],
    invoices: [],
    debts: [],
    household: h,
    userId: ANA,
  };
}

beforeEach(() => {
  setClock(new Date(2026, 10, 28, 10));
  __resetRemoteActionsForTests();
  useKashStore.getState().reset();
  useKashStore.setState((s) => ({ auth: 'app', userId: ANA, user: { ...s.user, name: 'Ana Souza' }, ui: { ...s.ui, dataStatus: 'ready' } }));
  jest.restoreAllMocks();
  jest.clearAllMocks();
});
afterAll(() => setClock(null));

describe('conta compartilhada (app)', () => {
  it('visão: tudo, meu + casal e só casal, trocando sem rede e salvando no servidor', async () => {
    installRemoteActions();
    await act(() => useKashStore.getState().hydrateFromServer(snapshot(household())));
    expect(useKashStore.getState().accounts.map((a) => a.name)).toEqual(['Pessoal Ana', 'Casa', 'Pessoal Bruno']);
    await act(() => useKashStore.getState().setViewScope('mine_shared'));
    expect(useKashStore.getState().txs.map((t) => t.title)).toEqual(['Café', 'Mercado']);
    await act(() => useKashStore.getState().setViewScope('shared'));
    expect(useKashStore.getState().accounts.map((a) => a.name)).toEqual(['Casa']);
    await act(async () => {});
    expect(mocked.updateHouseholdSettings).toHaveBeenLastCalledWith(expect.anything(), { viewScope: 'shared' });
    // o snapshot seguinte respeita a visão salva
    await act(() => useKashStore.getState().hydrateFromServer(snapshot(household({ viewScope: 'shared' }))));
    expect(useKashStore.getState().accounts.map((a) => a.name)).toEqual(['Casa']);
  });

  it('o pessoal do Bruno é só leitura; o do casal abre para editar', async () => {
    await act(() => useKashStore.getState().hydrateFromServer(snapshot(household())));
    await act(() => useKashStore.getState().openTransaction('t-bruno'));
    expect(useKashStore.getState().ui).toMatchObject({ sheet: null, toast: 'É pessoal de Bruno: só Bruno pode alterar.' });
    await act(() => useKashStore.getState().openEdit({ kind: 'account', id: 'a-bruno' }));
    expect(useKashStore.getState().ui.sheet).toBeNull();
    await act(() => useKashStore.getState().openTransaction('t-casa'));
    expect(useKashStore.getState().ui).toMatchObject({ sheet: 'expense', editingTxId: 't-casa' });
  });

  it('criar compartilhado: a conta vai com o espaço; lançamento nela é do casal; a linha mostra quem', async () => {
    installRemoteActions();
    await act(() => useKashStore.getState().hydrateFromServer(snapshot(household())));
    await act(() => useKashStore.getState().addAccount({ name: 'Reserva do casal', kind: 'Poupança', bank: '', balance: 0, color: '#C6F432', shared: true }));
    expect(useKashStore.getState().accounts.at(-1)).toMatchObject({ householdId: 'h1', ownerId: ANA });
    await act(async () => {});
    expect(mocked.createAccount).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ householdId: 'h1' }));

    await act(() => useKashStore.getState().addTransaction({ kind: 'expense', amountCents: 5000, category: 'Comida', sourceId: 'a-casa', note: 'Feira', installments: 1 }));
    expect(useKashStore.getState().txs[0]).toMatchObject({ title: 'Feira', householdId: 'h1', ownerId: ANA });

    await renderWithTheme(<TxRow tx={{ id: 't-bruno', title: 'Cinema', initial: 'C', color: '#fff', meta: 'Hoje · Comida · Pessoal Bruno', amount: -10, isExpense: true, kind: 'expense' }} testID="row" />);
    expect(screen.getByTestId('row')).toHaveTextContent(/Pessoal Bruno · Bruno/);
  });

  it('tela: convida (código + compartilhar) e entra com o código de outra pessoa', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as never);
    mocked.createHouseholdInvite.mockResolvedValueOnce({ code: 'ABCDEFGH', expiresAt: '2026-12-05T10:00:00Z' });
    mocked.getHousehold.mockResolvedValueOnce({ id: 'h1', name: 'Nossa conta', invite: { code: 'ABCDEFGH', expiresAt: '2026-12-05T10:00:00Z' }, members: [household().members[0]!] });
    await renderWithTheme(<SharedAccountScreen />);
    await fireEvent.press(screen.getByTestId('shared-invite-create'));
    await act(async () => {});
    expect(share).toHaveBeenCalledWith({ message: expect.stringContaining('convite?codigo=ABCDEFGH') });
    expect(screen.getByTestId('shared-invite-code')).toHaveTextContent('ABCD EFGH');

    mocked.acceptHouseholdInvite.mockResolvedValueOnce('h2');
    mocked.getHousehold.mockResolvedValueOnce(household());
    await fireEvent.changeText(screen.getByTestId('shared-code'), 'wxyz 2345');
    await fireEvent.press(screen.getByTestId('shared-join'));
    await act(async () => {});
    expect(mocked.acceptHouseholdInvite).toHaveBeenCalledWith(expect.anything(), 'WXYZ 2345');
    expect(useKashStore.getState().ui.toast).toBe('Pronto! Agora vocês dividem a conta.');
    expect(screen.getByTestId('shared-members')).toHaveTextContent(/Bruno Lima/);
  });

  it('juntos: mostrar o pessoal, avisos e sair', async () => {
    await act(() => useKashStore.getState().setHousehold(household()));
    await renderWithTheme(<SharedAccountScreen />);
    await fireEvent.press(screen.getByTestId('shared-mine-all'));
    expect(mocked.updateHouseholdSettings).toHaveBeenCalledWith(expect.anything(), { sharePersonal: true });
    expect(useKashStore.getState().household!.members[0]!.sharePersonal).toBe(true);
    await fireEvent.press(screen.getByTestId('shared-notify-off'));
    expect(mocked.updateHouseholdSettings).toHaveBeenLastCalledWith(expect.anything(), { notifyScope: 'off' });

    mocked.getHousehold.mockResolvedValueOnce(null);
    jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => buttons?.find((b) => b.text === 'Sair')?.onPress?.());
    await fireEvent.press(screen.getByTestId('shared-leave'));
    await act(async () => {});
    expect(mocked.leaveHousehold).toHaveBeenCalled();
    expect(useKashStore.getState().household).toBeNull();
  });
});
