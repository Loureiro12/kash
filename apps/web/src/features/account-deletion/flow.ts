/**
 * Fluxo de exclusão de conta pelo site como máquina de estados pura (testada em tests/unit).
 * signIn → confirm → deleting → done; erros voltam para o passo em que aconteceram.
 */
export type Step = 'signIn' | 'signingIn' | 'confirm' | 'deleting' | 'done';

export interface FlowState {
  step: Step;
  /** e-mail da conta confirmada (mostrado na confirmação e no fim) */
  email: string | null;
  error: string | null;
  acknowledged: boolean;
}

export type FlowEvent =
  | { type: 'submitSignIn' }
  | { type: 'signedIn'; email: string }
  | { type: 'failed'; message: string }
  | { type: 'toggleAck'; value: boolean }
  | { type: 'submitDelete' }
  | { type: 'deleted' }
  | { type: 'cancel' };

export const initialFlow: FlowState = { step: 'signIn', email: null, error: null, acknowledged: false };

export function flowReducer(state: FlowState, event: FlowEvent): FlowState {
  switch (event.type) {
    case 'submitSignIn':
      return state.step === 'signIn' ? { ...state, step: 'signingIn', error: null } : state;
    case 'signedIn':
      return state.step === 'signingIn' ? { ...state, step: 'confirm', email: event.email, error: null, acknowledged: false } : state;
    case 'failed':
      if (state.step === 'signingIn') return { ...state, step: 'signIn', error: event.message };
      if (state.step === 'deleting') return { ...state, step: 'confirm', error: event.message };
      return state;
    case 'toggleAck':
      return state.step === 'confirm' ? { ...state, acknowledged: event.value, error: null } : state;
    case 'submitDelete':
      return state.step === 'confirm' && state.acknowledged ? { ...state, step: 'deleting', error: null } : state;
    case 'deleted':
      return state.step === 'deleting' ? { ...state, step: 'done', error: null } : state;
    case 'cancel':
      return state.step === 'confirm' ? initialFlow : state;
  }
}

/** Validação local antes de chamar o servidor. */
export function validateCredentials(email: string, password: string): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Digite o e-mail da sua conta.';
  if (!password) return 'Digite sua senha.';
  return null;
}
