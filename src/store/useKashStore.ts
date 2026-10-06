import { create } from 'zustand';
import type { CardGradient } from '@/design-system/tokens/colors';
import { toISODate } from '@/domain/dates';
import { round2 } from '@/domain/money';
import { addToGoal, recordDeposit } from '@/domain/selectors/goals';
import { rollover } from '@/domain/selectors/rollover';
import type { Account, Bill, Card, Category, Goal, Invoice, Plan, Settings, ThemeMode, Tx, TxKind, User } from '@/domain/types';
import { isAccountId } from '@/domain/types';
import { createId } from '@/lib/ids';
import { now } from '@/lib/clock';
import { seedData } from './seed';

export type AuthStatus = 'onboarding' | 'login' | 'app';
/** estado de uma requisição de auth simulada */
export type RequestStatus = 'idle' | 'loading' | 'error' | 'success';

export interface Credentials {
  email: string;
  password: string;
}
export interface SignUpInput extends Credentials {
  name: string;
}

/** Auth simulada (sem backend): regras documentadas no README. */
export const MOCK_AUTH = {
  delayMs: 600,
  /** senha que simula credencial inválida */
  wrongPassword: 'errada123',
  /** domínio de e-mail que simula falha de rede */
  offlineDomain: '@offline.test',
  minPassword: 6,
} as const;
export type AccountsSegment = 'bank' | 'bills';
export type SheetName = 'expense' | 'addCard' | 'addAccount' | 'addGoal' | 'deposit' | 'addBill' | 'changePassword' | 'payInvoice' | 'deleteAccount';

export interface NewTransaction {
  kind: TxKind;
  amountCents: number;
  category: Category;
  sourceId: string;
  note: string;
  installments: number;
  /** ISO date; default hoje */
  date?: string;
}

export interface TxPatch {
  title?: string;
  category?: Category;
  /** valor absoluto em centavos */
  amountCents?: number;
  sourceId?: string;
  date?: string;
}

export type DeleteScope = 'single' | 'plan';

export type EditableKind = 'card' | 'account' | 'bill' | 'goal';
export interface EditingRef {
  kind: EditableKind;
  id: string;
}

/** Estado dos dados da sessão (preparação para a integração). */
export type DataStatus = 'ready' | 'loading' | 'error';

export interface ToastAction {
  label: string;
  onPress: () => void;
}

export interface NewCard {
  name: string;
  last4: string;
  limit: number;
  closingDay: number | null;
  dueDay: number | null;
  gradientId: CardGradient['id'];
}

export interface NewAccount {
  name: string;
  kind: string;
  bank: string;
  balance: number;
  color: string;
}

export interface NewGoal {
  name: string;
  target: number;
  saved: number;
  monthly: number;
  color: string;
  accountId?: string;
  depositDay?: number | null;
}

export interface NewBill {
  name: string;
  amount: number;
  dueDay: number;
  category: Category;
  sourceId?: string;
}

export interface NewDeposit {
  goalId: string;
  amountCents: number;
  accountId?: string;
}

export interface KashState {
  auth: AuthStatus;
  authRequest: { status: RequestStatus; error: string | null };
  invoices: Invoice[];
  /** último mês ("yyyy-mm") em que a virada foi processada */
  lastRolloverMonth: string;
  user: User;
  settings: Settings;
  accounts: Account[];
  cards: Card[];
  txs: Tx[];
  bills: Bill[];
  goals: Goal[];
  plans: Plan[];
  ui: {
    sheet: SheetName | null;
    /** incrementa a cada abertura — usado como `key` para remontar formulários com estado limpo */
    sheetNonce: number;
    toast: string | null;
    toastAction: ToastAction | null;
    /** lançamento em edição no sheet de lançamento (null = novo) */
    editingTxId: string | null;
    /** último lançamento excluído, para desfazer */
    lastDeleted: { txs: Tx[]; plan: Plan | null; accounts: Account[]; bills: Bill[]; invoices: Invoice[] } | null;
    /** cartão/conta/conta fixa/meta em edição no sheet correspondente (null = novo) */
    editing: EditingRef | null;
    dataStatus: DataStatus;
    selectedCardId: string | null;
    accountsSegment: AccountsSegment;
    /** meta alvo do sheet de depósito */
    depositGoalId: string | null;
    /** fatura alvo do sheet de pagamento */
    payInvoiceId: string | null;
  };

  // auth
  start: () => void;
  login: () => void;
  signIn: (input: Credentials) => Promise<boolean>;
  signUp: (input: SignUpInput) => Promise<boolean>;
  requestPasswordReset: (email: string) => Promise<boolean>;
  resetAuthRequest: () => void;
  logout: () => void;
  deleteAccount: () => void;

  // settings
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  toggleHideValues: () => void;
  toggleBillReminder: () => void;
  toggleBiometrics: () => void;
  setMonthlyBudget: (value: number) => void;
  updateUser: (input: Partial<User>) => void;

  // ui
  openSheet: (sheet: SheetName) => void;
  openDeposit: (goalId: string) => void;
  openTransaction: (txId: string) => void;
  openPayInvoice: (invoiceId: string) => void;
  openEdit: (ref: EditingRef) => void;
  setDataStatus: (status: DataStatus) => void;
  closeSheet: () => void;
  showToast: (message: string, action?: ToastAction) => void;
  hideToast: () => void;
  selectCard: (id: string) => void;
  setAccountsSegment: (segment: AccountsSegment) => void;

  // domain
  addTransaction: (input: NewTransaction) => void;
  updateTransaction: (id: string, patch: TxPatch) => void;
  deleteTransaction: (id: string, scope?: DeleteScope) => void;
  undoDelete: () => void;
  addCard: (input: NewCard) => void;
  updateCard: (id: string, input: NewCard) => void;
  removeCard: (id: string) => void;
  addAccount: (input: NewAccount) => void;
  updateAccount: (id: string, input: NewAccount) => void;
  removeAccount: (id: string) => void;
  toggleBillPaid: (id: string) => void;
  addBill: (input: NewBill) => void;
  updateBill: (id: string, input: NewBill) => void;
  removeBill: (id: string) => void;
  contributeToGoal: (id: string, amount: number) => void;
  addGoal: (input: NewGoal) => void;
  updateGoal: (id: string, input: NewGoal) => void;
  removeGoal: (id: string) => void;
  recordDeposit: (input: NewDeposit) => void;
  /** processa a virada de mês se o mês atual ainda não foi processado */
  rolloverIfNeeded: () => void;
  payInvoice: (invoiceId: string, accountId: string) => void;

  /** reseta para o seed (usado em testes) */
  reset: () => void;
}

const buildInitial = () => {
  const seed = seedData(now());
  return {
    auth: 'onboarding' as AuthStatus,
    authRequest: { status: 'idle' as RequestStatus, error: null },
    ...seed,
    ui: { sheet: null, sheetNonce: 0, toast: null, toastAction: null, editingTxId: null, lastDeleted: null, editing: null, dataStatus: 'ready' as DataStatus, selectedCardId: seed.cards[0]?.id ?? null, accountsSegment: 'bank' as AccountsSegment, depositGoalId: null, payInvoiceId: null },
  };
};

let toastTimer: ReturnType<typeof setTimeout> | null = null;
const mockDelay = () => new Promise<void>((resolve) => setTimeout(resolve, MOCK_AUTH.delayMs));
export const TOAST_DURATION_MS = 2200;
/** toasts com ação (Desfazer) ficam mais tempo */
export const TOAST_ACTION_DURATION_MS = 4500;

export const useKashStore = create<KashState>((set, get) => ({
  ...buildInitial(),

  start: () => set({ auth: 'login' }),
  login: () => set({ auth: 'app' }),
  resetAuthRequest: () => set({ authRequest: { status: 'idle', error: null } }),
  signIn: async ({ email, password }) => {
    set({ authRequest: { status: 'loading', error: null } });
    await mockDelay();
    if (email.trim().toLowerCase().endsWith(MOCK_AUTH.offlineDomain)) {
      set({ authRequest: { status: 'error', error: 'Sem conexão. Confere sua internet e tenta de novo.' } });
      return false;
    }
    if (password === MOCK_AUTH.wrongPassword) {
      set({ authRequest: { status: 'error', error: 'E-mail ou senha incorretos.' } });
      return false;
    }
    set({ auth: 'app', authRequest: { status: 'success', error: null } });
    return true;
  },
  signUp: async ({ name, email, password }) => {
    set({ authRequest: { status: 'loading', error: null } });
    await mockDelay();
    if (email.trim().toLowerCase().endsWith(MOCK_AUTH.offlineDomain)) {
      set({ authRequest: { status: 'error', error: 'Sem conexão. Confere sua internet e tenta de novo.' } });
      return false;
    }
    if (password.length < MOCK_AUTH.minPassword) {
      set({ authRequest: { status: 'error', error: `A senha precisa ter pelo menos ${MOCK_AUTH.minPassword} caracteres.` } });
      return false;
    }
    set((s) => ({ auth: 'app', user: { ...s.user, name: name.trim(), email: email.trim() }, authRequest: { status: 'success', error: null } }));
    return true;
  },
  requestPasswordReset: async (email) => {
    set({ authRequest: { status: 'loading', error: null } });
    await mockDelay();
    if (email.trim().toLowerCase().endsWith(MOCK_AUTH.offlineDomain)) {
      set({ authRequest: { status: 'error', error: 'Sem conexão. Confere sua internet e tenta de novo.' } });
      return false;
    }
    set({ authRequest: { status: 'success', error: null } });
    return true;
  },
  logout: () => set({ auth: 'login', ui: { ...get().ui, sheet: null } }),
  deleteAccount: () => {
    set({ ...buildInitial(), auth: 'onboarding' });
    get().showToast('Conta excluída');
  },

  setTheme: (theme) => set((s) => ({ settings: { ...s.settings, theme } })),
  toggleTheme: () => set((s) => ({ settings: { ...s.settings, theme: s.settings.theme === 'dark' ? 'light' : 'dark' } })),
  toggleHideValues: () => set((s) => ({ settings: { ...s.settings, hideValues: !s.settings.hideValues } })),
  toggleBillReminder: () => set((s) => ({ settings: { ...s.settings, billReminder: !s.settings.billReminder } })),
  toggleBiometrics: () => set((s) => ({ settings: { ...s.settings, biometrics: !s.settings.biometrics } })),
  setMonthlyBudget: (value) => {
    if (!(value > 0)) return;
    set((s) => ({ settings: { ...s.settings, monthlyBudget: round2(value) } }));
  },
  updateUser: (input) =>
    set((s) => ({
      user: {
        name: (input.name ?? s.user.name).trim() || s.user.name,
        email: (input.email ?? s.user.email).trim() || s.user.email,
        phone: (input.phone ?? s.user.phone).trim(),
      },
    })),

  openSheet: (sheet) => set((s) => ({ ui: { ...s.ui, sheet, sheetNonce: s.ui.sheetNonce + 1, editingTxId: sheet === 'expense' ? null : s.ui.editingTxId, editing: null } })),
  openEdit: (ref) => {
    const sheet: SheetName = ref.kind === 'card' ? 'addCard' : ref.kind === 'account' ? 'addAccount' : ref.kind === 'bill' ? 'addBill' : 'addGoal';
    set((s) => ({ ui: { ...s.ui, sheet, sheetNonce: s.ui.sheetNonce + 1, editing: ref } }));
  },
  setDataStatus: (status) => set((s) => ({ ui: { ...s.ui, dataStatus: status } })),
  openTransaction: (txId) => set((s) => ({ ui: { ...s.ui, sheet: 'expense', sheetNonce: s.ui.sheetNonce + 1, editingTxId: txId } })),
  openPayInvoice: (invoiceId) => set((s) => ({ ui: { ...s.ui, sheet: 'payInvoice', sheetNonce: s.ui.sheetNonce + 1, payInvoiceId: invoiceId } })),
  openDeposit: (goalId) => set((s) => ({ ui: { ...s.ui, sheet: 'deposit', sheetNonce: s.ui.sheetNonce + 1, depositGoalId: goalId } })),
  closeSheet: () => set((s) => ({ ui: { ...s.ui, sheet: null } })),
  showToast: (message, action) => {
    if (toastTimer) clearTimeout(toastTimer);
    set((s) => ({ ui: { ...s.ui, toast: message, toastAction: action ?? null } }));
    toastTimer = setTimeout(() => get().hideToast(), action ? TOAST_ACTION_DURATION_MS : TOAST_DURATION_MS);
  },
  hideToast: () => {
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = null;
    set((s) => ({ ui: { ...s.ui, toast: null, toastAction: null } }));
  },
  selectCard: (id) => set((s) => ({ ui: { ...s.ui, selectedCardId: id } })),
  setAccountsSegment: (segment) => set((s) => ({ ui: { ...s.ui, accountsSegment: segment } })),

  addTransaction: ({ kind, amountCents, category, sourceId, note, installments, date }) => {
    const amount = amountCents / 100;
    if (amount <= 0) return;
    const isAccount = isAccountId(sourceId);
    const when = date ?? toISODate(now());
    if (kind === 'income') {
      // entradas só em contas
      if (!isAccount) return;
      const title = note.trim() || 'Entrada';
      set((s) => ({
        txs: [{ id: createId('tx'), title, category: 'Entrada', amount, date: when, sourceId }, ...s.txs],
        accounts: s.accounts.map((a) => (a.id === sourceId ? { ...a, balance: round2(a.balance + amount) } : a)),
        ui: { ...s.ui, sheet: null },
      }));
      return;
    }
    const n = isAccount ? 1 : Math.max(1, installments);
    const per = round2(amount / n);
    const title = note.trim() || category;
    const planId = n > 1 ? createId('plan') : undefined;
    set((s) => ({
      txs: [{ id: createId('tx'), title: n > 1 ? `${title} (1/${n})` : title, category, amount: -per, date: when, sourceId, planId }, ...s.txs],
      plans: planId ? [...s.plans, { id: planId, title, category, cardId: sourceId, installments: n, current: 1, perInstallment: per }] : s.plans,
      accounts: isAccount ? s.accounts.map((a) => (a.id === sourceId ? { ...a, balance: round2(a.balance - amount) } : a)) : s.accounts,
      ui: { ...s.ui, sheet: null },
    }));
  },

  /** Edita um lançamento ajustando saldos de conta (reverte o antigo, aplica o novo). */
  updateTransaction: (id, patch) =>
    set((s) => {
      const tx = s.txs.find((t) => t.id === id);
      if (!tx) return s;
      const sign = tx.amount < 0 ? -1 : 1;
      const amount = patch.amountCents !== undefined ? round2((patch.amountCents / 100) * sign) : tx.amount;
      if (amount === 0) return s;
      const next: Tx = {
        ...tx,
        title: patch.title?.trim() || tx.title,
        category: tx.category === 'Fatura' ? 'Fatura' : tx.amount < 0 ? (patch.category ?? tx.category) : 'Entrada',
        amount,
        date: patch.date ?? tx.date,
        sourceId: patch.sourceId ?? tx.sourceId,
      };
      const accounts = s.accounts.map((a) => {
        let balance = a.balance;
        if (a.id === tx.sourceId) balance -= tx.amount;
        if (a.id === next.sourceId) balance += next.amount;
        return balance === a.balance ? a : { ...a, balance: round2(balance) };
      });
      return { txs: s.txs.map((t) => (t.id === id ? next : t)), accounts, ui: { ...s.ui, sheet: null } };
    }),

  /**
   * Exclui um lançamento (ou todas as parcelas do plano) devolvendo saldos,
   * destravando conta fixa paga e guardando o estado para desfazer.
   */
  deleteTransaction: (id, scope = 'single') =>
    set((s) => {
      const tx = s.txs.find((t) => t.id === id);
      if (!tx) return s;
      const plan = tx.planId ? (s.plans.find((p) => p.id === tx.planId) ?? null) : null;
      const removing = plan && scope === 'plan' ? s.txs.filter((t) => t.planId === plan.id) : [tx];
      const removedIds = new Set(removing.map((t) => t.id));
      const accounts = s.accounts.map((a) => {
        const delta = removing.filter((t) => t.sourceId === a.id).reduce((sum, t) => sum + t.amount, 0);
        return delta === 0 ? a : { ...a, balance: round2(a.balance - delta) };
      });
      const bills = s.bills.map((b) => (b.paidTxId && removedIds.has(b.paidTxId) ? { ...b, paid: false, paidTxId: undefined } : b));
      const invoices = s.invoices.map((i) => (i.paidTxId && removedIds.has(i.paidTxId) ? { ...i, paid: false, paidTxId: undefined, paidAt: undefined } : i));
      let plans = s.plans;
      if (plan) {
        if (scope === 'plan') plans = s.plans.filter((p) => p.id !== plan.id);
        else {
          const current = plan.current - 1;
          plans = current <= 0 ? s.plans.filter((p) => p.id !== plan.id) : s.plans.map((p) => (p.id === plan.id ? { ...p, current } : p));
        }
      }
      return {
        txs: s.txs.filter((t) => !removedIds.has(t.id)),
        accounts,
        bills,
        invoices,
        plans,
        ui: { ...s.ui, sheet: null, editingTxId: null, lastDeleted: { txs: removing, plan, accounts: s.accounts, bills: s.bills, invoices: s.invoices } },
      };
    }),

  undoDelete: () =>
    set((s) => {
      const last = s.ui.lastDeleted;
      if (!last) return s;
      const restored = [...last.txs, ...s.txs].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
      const plans = last.plan ? [...s.plans.filter((p) => p.id !== last.plan!.id), last.plan] : s.plans;
      return { txs: restored, accounts: last.accounts, bills: last.bills, invoices: last.invoices, plans, ui: { ...s.ui, lastDeleted: null, toast: null, toastAction: null } };
    }),

  addCard: ({ name, last4, limit, closingDay, dueDay, gradientId }) => {
    const id = createId('card');
    const card: Card = { id, name: name.trim(), last4, limit, closingDay: closingDay ?? 1, dueDay: dueDay ?? 10, gradientId };
    set((s) => ({ cards: [...s.cards, card], ui: { ...s.ui, sheet: null, selectedCardId: id } }));
  },

  updateCard: (id, { name, last4, limit, closingDay, dueDay, gradientId }) =>
    set((s) => ({
      cards: s.cards.map((c) => (c.id === id ? { ...c, name: name.trim() || c.name, last4: last4 || c.last4, limit: limit > 0 ? limit : c.limit, closingDay: closingDay ?? c.closingDay, dueDay: dueDay ?? c.dueDay, gradientId } : c)),
      ui: { ...s.ui, sheet: null, editing: null },
    })),

  /** Remove o cartão com seus lançamentos e parcelamentos; contas fixas cobradas nele ficam sem origem. */
  removeCard: (id) =>
    set((s) => {
      const cards = s.cards.filter((c) => c.id !== id);
      return {
        cards,
        txs: s.txs.filter((t) => t.sourceId !== id),
        plans: s.plans.filter((p) => p.cardId !== id),
        invoices: s.invoices.filter((i) => i.cardId !== id),
        bills: s.bills.map((b) => (b.sourceId === id ? { ...b, sourceId: undefined } : b)),
        ui: { ...s.ui, sheet: null, editing: null, selectedCardId: s.ui.selectedCardId === id ? (cards[0]?.id ?? null) : s.ui.selectedCardId },
      };
    }),

  addAccount: ({ name, kind, bank, balance, color }) => {
    const account: Account = { id: createId('acc'), name: name.trim(), kind: bank.trim() ? `${kind} · ${bank.trim()}` : kind, balance, color };
    set((s) => ({ accounts: [...s.accounts, account], ui: { ...s.ui, sheet: null } }));
  },

  /**
   * Marcar como paga gera o lançamento da cobrança (fatura do cartão ou débito na conta);
   * desmarcar remove o lançamento e devolve o saldo.
   */
  updateAccount: (id, { name, kind, bank, balance, color }) =>
    set((s) => ({
      accounts: s.accounts.map((a) => (a.id === id ? { ...a, name: name.trim() || a.name, kind: bank.trim() ? `${kind} · ${bank.trim()}` : kind, balance: round2(balance), color } : a)),
      ui: { ...s.ui, sheet: null, editing: null },
    })),

  /** Remove a conta e seus lançamentos; contas fixas e metas ligadas a ela ficam sem conta. */
  removeAccount: (id) =>
    set((s) => ({
      accounts: s.accounts.filter((a) => a.id !== id),
      txs: s.txs.filter((t) => t.sourceId !== id),
      bills: s.bills.map((b) => (b.sourceId === id ? { ...b, sourceId: undefined } : b)),
      goals: s.goals.map((g) => (g.accountId === id ? { ...g, accountId: undefined } : g)),
      ui: { ...s.ui, sheet: null, editing: null },
    })),

  toggleBillPaid: (id) =>
    set((s) => {
      const bill = s.bills.find((b) => b.id === id);
      if (!bill) return s;
      if (!bill.paid) {
        const txId = createId('tx');
        const tx: Tx = { id: txId, title: bill.name, category: bill.category, amount: -bill.amount, date: toISODate(now()), sourceId: bill.sourceId ?? 'manual' };
        const debit = bill.sourceId && isAccountId(bill.sourceId) ? bill.sourceId : null;
        return {
          bills: s.bills.map((b) => (b.id === id ? { ...b, paid: true, paidTxId: txId } : b)),
          txs: [tx, ...s.txs],
          accounts: debit ? s.accounts.map((a) => (a.id === debit ? { ...a, balance: round2(a.balance - bill.amount) } : a)) : s.accounts,
        };
      }
      const paidTx = bill.paidTxId ? s.txs.find((t) => t.id === bill.paidTxId) : undefined;
      const refund = paidTx && isAccountId(paidTx.sourceId) ? paidTx.sourceId : null;
      return {
        bills: s.bills.map((b) => (b.id === id ? { ...b, paid: false, paidTxId: undefined } : b)),
        txs: paidTx ? s.txs.filter((t) => t.id !== paidTx.id) : s.txs,
        accounts: refund ? s.accounts.map((a) => (a.id === refund ? { ...a, balance: round2(a.balance + bill.amount) } : a)) : s.accounts,
      };
    }),

  addBill: ({ name, amount, dueDay, category, sourceId }) => {
    if (!name.trim() || amount <= 0 || dueDay < 1 || dueDay > 31) return;
    const bill: Bill = { id: createId('bill'), name: name.trim(), amount: round2(amount), dueDay, paid: false, category, sourceId };
    set((s) => ({ bills: [...s.bills, bill].sort((a, b) => a.dueDay - b.dueDay), ui: { ...s.ui, sheet: null } }));
  },

  updateBill: (id, { name, amount, dueDay, category, sourceId }) =>
    set((s) => ({
      bills: s.bills
        .map((b) => (b.id === id ? { ...b, name: name.trim() || b.name, amount: amount > 0 ? round2(amount) : b.amount, dueDay: dueDay >= 1 && dueDay <= 31 ? dueDay : b.dueDay, category, sourceId } : b))
        .sort((a, b) => a.dueDay - b.dueDay),
      ui: { ...s.ui, sheet: null, editing: null },
    })),

  /** Remove a conta fixa; o lançamento de um pagamento já feito é mantido. */
  removeBill: (id) => set((s) => ({ bills: s.bills.filter((b) => b.id !== id), ui: { ...s.ui, sheet: null, editing: null } })),

  contributeToGoal: (id, amount) => set((s) => ({ goals: s.goals.map((g) => (g.id === id ? addToGoal(g, amount) : g)) })),

  addGoal: ({ name, target, saved, monthly, color, accountId, depositDay }) => {
    if (!name.trim() || target <= 0) return;
    const goal: Goal = {
      id: createId('goal'),
      name: name.trim(),
      target: round2(target),
      saved: round2(Math.min(Math.max(0, saved), target)),
      monthly: round2(Math.max(0, monthly)),
      color,
      accountId,
      depositDay: depositDay ?? undefined,
    };
    set((s) => ({ goals: [...s.goals, goal], ui: { ...s.ui, sheet: null } }));
  },

  updateGoal: (id, { name, target, saved, monthly, color, accountId, depositDay }) =>
    set((s) => ({
      goals: s.goals.map((g) =>
        g.id === id
          ? { ...g, name: name.trim() || g.name, target: target > 0 ? round2(target) : g.target, saved: round2(Math.min(Math.max(0, saved), target > 0 ? target : g.target)), monthly: round2(Math.max(0, monthly)), color, accountId, depositDay: depositDay ?? undefined }
          : g,
      ),
      ui: { ...s.ui, sheet: null, editing: null },
    })),

  /** Remove a meta; o dinheiro guardado continua na conta. */
  removeGoal: (id) => set((s) => ({ goals: s.goals.filter((g) => g.id !== id), ui: { ...s.ui, sheet: null, editing: null } })),

  rolloverIfNeeded: () => {
    const s = get();
    const result = rollover({ lastRolloverMonth: s.lastRolloverMonth, cards: s.cards, txs: s.txs, bills: s.bills, plans: s.plans, invoices: s.invoices }, now(), createId);
    if (result.months.length === 0) return;
    set({ lastRolloverMonth: result.lastRolloverMonth, txs: result.txs, bills: result.bills, plans: result.plans, invoices: result.invoices });
  },

  /** Paga a fatura debitando a conta; o lançamento tem categoria "Fatura" e não conta como gasto do mês. */
  payInvoice: (invoiceId, accountId) =>
    set((s) => {
      const invoice = s.invoices.find((i) => i.id === invoiceId);
      if (!invoice || invoice.paid) return s;
      const card = s.cards.find((c) => c.id === invoice.cardId);
      const today = toISODate(now());
      const txId = createId('tx');
      const tx: Tx = { id: txId, title: `Fatura ${card?.name ?? 'cartão'}`, category: 'Fatura', amount: -invoice.total, date: today, sourceId: accountId };
      return {
        txs: [tx, ...s.txs],
        accounts: s.accounts.map((a) => (a.id === accountId ? { ...a, balance: round2(a.balance - invoice.total) } : a)),
        invoices: s.invoices.map((i) => (i.id === invoiceId ? { ...i, paid: true, paidTxId: txId, paidAt: today } : i)),
        ui: { ...s.ui, sheet: null, payInvoiceId: null },
      };
    }),

  recordDeposit: ({ goalId, amountCents, accountId }) => {
    const amount = amountCents / 100;
    if (amount <= 0) return;
    const today = toISODate(now());
    set((s) => ({
      goals: s.goals.map((g) => (g.id === goalId ? recordDeposit(g, amount, today, accountId) : g)),
      ui: { ...s.ui, sheet: null },
    }));
  },

  reset: () => set(buildInitial()),
}));
