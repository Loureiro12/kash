/**
 * Eventos de uso, iguais no app e na web (Google Analytics for Firebase). Nunca levam valores,
 * nomes de lançamentos, e-mail ou nome da pessoa: só o tipo da ação e contagens.
 */
export type AuthMethod = 'email' | 'apple' | 'google';

export interface TelemetryEvents {
  sign_up: { method: AuthMethod };
  login: { method: AuthMethod };
  onboarding_complete: { skipped: boolean };
  add_transaction: { kind: 'expense' | 'income'; source_type: 'card' | 'account'; installments: number };
  add_transfer: Record<string, never>;
  pay_invoice: Record<string, never>;
  pay_bill: Record<string, never>;
  add_account: Record<string, never>;
  add_card: Record<string, never>;
  add_bill: Record<string, never>;
  add_goal: Record<string, never>;
  goal_deposit: Record<string, never>;
  budget_set: { split: boolean };
  import_statement: { target: 'card' | 'account'; format: 'pdf' | 'ofx' | 'csv'; plans: number; txs: number; transfers: number; matched: number };
  import_undo: Record<string, never>;
  /** site: clique no botão de uma loja */
  store_click: { store: 'app_store' | 'google_play'; placement: string };
}

export type TelemetryEventName = keyof TelemetryEvents;
