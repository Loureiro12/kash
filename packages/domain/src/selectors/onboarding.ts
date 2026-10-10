import type { Account, Bill, Card, Goal, Settings, Tx } from '../types';
import { isTransfer } from '../types';

export type OnboardingStepId = 'account' | 'expense' | 'card' | 'bill' | 'goal';

export interface OnboardingStep {
  id: OnboardingStepId;
  title: string;
  description: string;
  done: boolean;
  /** não conta para "tudo pronto" (ex.: quem não usa cartão) */
  optional: boolean;
}

export interface OnboardingInput {
  accounts: Account[];
  cards: Card[];
  txs: Tx[];
  bills: Bill[];
  goals: Goal[];
  settings: Pick<Settings, 'onboardingDone' | 'checklistHidden'>;
}

export interface OnboardingStatus {
  steps: OnboardingStep[];
  /** passos obrigatórios concluídos / total de obrigatórios */
  doneCount: number;
  total: number;
  pct: number;
  allDone: boolean;
  /** próximo passo sugerido (o primeiro obrigatório pendente) */
  next: OnboardingStep | null;
  /** abrir as boas-vindas: primeiro acesso, sem nenhuma conta e sem ter pulado */
  showWelcome: boolean;
  /** mostrar o card "Primeiros passos" no Início */
  showChecklist: boolean;
}

/** gasto "de verdade" (não conta pagamento de fatura nem transferência) */
const isRealExpense = (t: Tx) => t.amount < 0 && t.category !== 'Fatura' && !isTransfer(t);

/** Primeiros passos do Kash, marcados a partir dos dados (nada de "marcar como feito" à mão). */
export function onboardingStatus(input: OnboardingInput): OnboardingStatus {
  const steps: OnboardingStep[] = [
    { id: 'account', title: 'Cadastre onde fica seu dinheiro', description: 'Conta corrente, poupança ou carteira, com o saldo de hoje.', done: input.accounts.length > 0, optional: false },
    { id: 'expense', title: 'Lance seu primeiro gasto', description: 'Valor, categoria e de onde saiu. Leva 10 segundos.', done: input.txs.some(isRealExpense), optional: false },
    { id: 'card', title: 'Adicione seu cartão de crédito', description: 'Pra acompanhar a fatura, o limite e as parcelas.', done: input.cards.length > 0, optional: true },
    { id: 'bill', title: 'Cadastre uma conta fixa', description: 'Aluguel, internet, streaming: o Kash avisa antes de vencer.', done: input.bills.length > 0, optional: false },
    { id: 'goal', title: 'Crie uma meta', description: 'Viagem, reserva, fone novo: guarde um pouco por vez.', done: input.goals.length > 0, optional: false },
  ];
  const required = steps.filter((s) => !s.optional);
  const doneCount = required.filter((s) => s.done).length;
  const allDone = doneCount === required.length;
  return {
    steps,
    doneCount,
    total: required.length,
    pct: Math.round((doneCount / required.length) * 100),
    allDone,
    next: required.find((s) => !s.done) ?? null,
    showWelcome: !input.settings.onboardingDone && input.accounts.length === 0,
    showChecklist: !input.settings.checklistHidden,
  };
}
