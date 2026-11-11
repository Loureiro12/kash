/**
 * Eventos de uso do app (ver TelemetryEvents em @kash/domain). Como em remoteActions, cada ação do
 * store ganha um "depois" que registra o evento; a ação em si não muda. Nada de valores ou nomes.
 */
import { track } from '@/services/telemetry';
import { useKashStore, type KashState } from '@/store';

type AnyFn = (...args: any[]) => any;
type ActionName = { [K in keyof KashState]: KashState[K] extends AnyFn ? K : never }[keyof KashState];

let installed = false;

function after<K extends ActionName>(name: K, onDone: (args: Parameters<Extract<KashState[K], AnyFn>>, result: unknown, before: KashState, after: KashState) => void) {
  const current = useKashStore.getState()[name] as AnyFn;
  const wrapped: AnyFn = (...args) => {
    const before = useKashStore.getState();
    const result = current(...args);
    const finish = (value: unknown) => {
      try {
        onDone(args as Parameters<Extract<KashState[K], AnyFn>>, value, before, useKashStore.getState());
      } catch {
        // telemetria nunca derruba uma ação
      }
      return value;
    };
    return result instanceof Promise ? result.then(finish) : finish(result);
  };
  useKashStore.setState({ [name]: wrapped } as Partial<KashState>);
}

/** Liga os eventos às ações. Instalar depois de installRemoteActions (envolve a versão já persistida). */
export function installTelemetryEvents() {
  if (installed) return;
  installed = true;
  after('signIn', (_a, ok) => ok && track('login', { method: 'email' }));
  after('signUp', (_a, ok) => ok && track('sign_up', { method: 'email' }));
  after('finishOnboarding', ([budget]) => track('onboarding_complete', { skipped: !(budget && budget > 0) }));
  after('addTransaction', ([input], _r, before) =>
    track('add_transaction', { kind: input.kind === 'income' ? 'income' : 'expense', source_type: before.cards.some((c) => c.id === input.sourceId) ? 'card' : 'account', installments: input.installments || 1 }),
  );
  after('addTransfer', () => track('add_transfer', {}));
  after('payInvoice', () => track('pay_invoice', {}));
  after('toggleBillPaid', ([id], _r, before) => !before.bills.find((b) => b.id === id)?.paid && track('pay_bill', {}));
  after('addAccount', () => track('add_account', {}));
  after('addCard', () => track('add_card', {}));
  after('addBill', () => track('add_bill', {}));
  after('addGoal', () => track('add_goal', {}));
  after('recordDeposit', () => track('goal_deposit', {}));
  after('contributeToGoal', () => track('goal_deposit', {}));
  after('setMonthlyBudget', () => track('budget_set', { split: false }));
  after('setBudgets', ([card]) => track('budget_set', { split: card > 0 }));
}
