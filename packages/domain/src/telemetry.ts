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
  /** assistente (Claude): pergunta enviada; `suggested` = tocou numa sugestão pronta */
  assistant_message: { suggested: boolean; photo?: boolean };
  /** retrospectiva do mês compartilhada como imagem; `hidden` = sem os valores */
  recap_shared: { hidden: boolean };
  /** comprovante anexado a um lançamento */
  attachment_added: Record<string, never>;
  /** conta compartilhada: convite criado, entrou com convite, trocou a visão */
  household_invite: Record<string, never>;
  household_join: Record<string, never>;
  household_view: { scope: 'all' | 'mine_shared' | 'shared' };
  /** lançamento proposto pelo assistente: mostrado, lançado direto, aberto para editar ou descartado */
  assistant_proposal: { action: 'shown' | 'saved' | 'edited' | 'dismissed' };
  /** "Zerar meus dados" concluído */
  reset_data: Record<string, never>;
  /** lançamento rápido aberto por atalho do iPhone (Back Tap, Siri, Atalhos) ou link */
  quick_add: { kind: 'expense' | 'income' | 'text'; via: 'shortcut' | 'link' };
  /** site: clique no botão de uma loja */
  store_click: { store: 'app_store' | 'google_play'; placement: string };
}

export type TelemetryEventName = keyof TelemetryEvents;
