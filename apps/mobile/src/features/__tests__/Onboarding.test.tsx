import { act, fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import * as api from '@kash/supabase-client';
import { __resetRemoteActionsForTests, installRemoteActions } from '@/data/remoteActions';
import { ChecklistCard } from '@/features/onboarding/ChecklistCard';
import { WelcomeScreen } from '@/features/onboarding/WelcomeScreen';
import { useKashStore } from '@/store';
import { renderWithTheme } from '@/test/render';

const mockRouter = { replace: jest.fn(), push: jest.fn(), navigate: jest.fn(), back: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, usePathname: () => '/' }));
jest.mock('@/data/source', () => ({ DATA_SOURCE: 'remote' }));
const mocked = api as jest.Mocked<typeof api>;

/** conta nova: nada cadastrado, boas-vindas e card pendentes */
function newUser() {
  useKashStore.setState((s) => ({
    auth: 'app',
    userId: 'u-1',
    user: { ...s.user, name: 'Bia Souza' },
    accounts: [],
    cards: [],
    txs: [],
    bills: [],
    goals: [],
    plans: [],
    settings: { ...s.settings, onboardingDone: false, checklistHidden: false, monthlyBudget: 1800 },
  }));
}

beforeEach(() => {
  __resetRemoteActionsForTests();
  useKashStore.getState().reset();
  newUser();
  jest.clearAllMocks();
});

describe('boas-vindas', () => {
  it('3 passos: conta (pelo sheet do app), sem cartão e limite; concluir grava e volta ao Início', async () => {
    await renderWithTheme(<WelcomeScreen />);
    expect(screen.getByTestId('welcome-step')).toHaveTextContent('Passo 1 de 3');
    expect(screen.getByText('Boas-vindas, Bia!')).toBeTruthy();
    expect(screen.queryByTestId('welcome-next')).toBeNull();

    await fireEvent.press(screen.getByTestId('welcome-add-account'));
    expect(useKashStore.getState().ui.sheet).toBe('addAccount');
    await act(async () => useKashStore.getState().addAccount({ name: 'Corrente', kind: 'Conta corrente', bank: '', balance: 1500, color: '#C6F432' }));
    expect(screen.getByTestId('welcome-accounts')).toHaveTextContent(/Corrente.*R\$ 1\.500,00/);

    await fireEvent.press(screen.getByTestId('welcome-next'));
    expect(screen.getByTestId('welcome-step')).toHaveTextContent('Passo 2 de 3');
    await fireEvent.press(screen.getByText('Não uso cartão'));
    expect(screen.getByTestId('welcome-step')).toHaveTextContent('Passo 3 de 3');

    await fireEvent.press(screen.getByTestId('welcome-budget-3000'));
    await fireEvent.press(screen.getByTestId('welcome-finish'));
    expect(useKashStore.getState().settings).toMatchObject({ onboardingDone: true, monthlyBudget: 3000 });
    expect(useKashStore.getState().ui.toast).toBe('Tudo pronto, Bia! Agora lance seu primeiro gasto.');
    expect(mockRouter.replace).toHaveBeenCalledWith('/');
  });

  it('"Pular" conclui sem mudar o limite', async () => {
    await renderWithTheme(<WelcomeScreen />);
    await fireEvent.press(screen.getByTestId('welcome-skip'));
    expect(useKashStore.getState().settings).toMatchObject({ onboardingDone: true, monthlyBudget: 1800 });
    expect(mockRouter.replace).toHaveBeenCalledWith('/');
  });

  it('concluir e esconder vão para o servidor', async () => {
    installRemoteActions();
    useKashStore.getState().finishOnboarding(3000);
    useKashStore.getState().setChecklistHidden(true);
    await act(async () => {});
    expect(mocked.updateSettings).toHaveBeenCalledWith(expect.anything(), { onboardingDone: true, monthlyBudget: 3000 });
    expect(mocked.updateSettings).toHaveBeenCalledWith(expect.anything(), { checklistHidden: true });
  });
});

describe('primeiros passos no Início', () => {
  it('marca sozinho pelos dados e cada passo abre o cadastro certo', async () => {
    await renderWithTheme(<ChecklistCard />);
    expect(screen.getByTestId('checklist-count')).toHaveTextContent('0 de 4 feitos');
    await fireEvent.press(screen.getByTestId('checklist-account-action'));
    expect(useKashStore.getState().ui.sheet).toBe('addAccount');
    await act(async () => useKashStore.getState().addAccount({ name: 'Corrente', kind: 'Conta corrente', bank: '', balance: 100, color: '#C6F432' }));
    expect(screen.getByTestId('checklist-count')).toHaveTextContent('1 de 4 feitos');
    await fireEvent.press(screen.getByTestId('checklist-expense-action'));
    expect(useKashStore.getState().ui.sheet).toBe('expense');
    expect(screen.getByTestId('checklist-card').props.accessibilityLabel).toBe('Adicione seu cartão de crédito, opcional, a fazer');
  });

  it('tudo feito vira "Tudo pronto!"; esconder some', async () => {
    useKashStore.setState({
      accounts: [{ id: 'a', name: 'Corrente', kind: 'Conta corrente', balance: 100, color: '#C6F432' }],
      txs: [{ id: 't', title: 'Almoço', category: 'Comida', amount: -30, date: '2026-10-01', sourceId: 'a' }],
      bills: [{ id: 'b', name: 'Internet', amount: 99, dueDay: 10, paid: false, category: 'Assinaturas' }],
      goals: [{ id: 'g', name: 'Viagem', target: 1000, saved: 0, color: '#6BC5FF', monthly: 100 }],
    });
    await renderWithTheme(<ChecklistCard />);
    expect(screen.getByTestId('checklist-done')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('checklist-close'));
    expect(useKashStore.getState().settings.checklistHidden).toBe(true);
    expect(screen.queryByTestId('checklist-done')).toBeNull();
  });
});
