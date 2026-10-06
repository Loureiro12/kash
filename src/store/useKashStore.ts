import { create } from 'zustand';
import type { CardGradient } from '@/design-system/tokens/colors';
import { toISODate } from '@/domain/dates';
import { round2 } from '@/domain/money';
import { addToGoal, recordDeposit } from '@/domain/selectors/goals';
import type { Account, Bill, Card, Category, Goal, Plan, Settings, ThemeMode, Tx, User } from '@/domain/types';
import { isAccountId } from '@/domain/types';
import { createId } from '@/lib/ids';
import { now } from '@/lib/clock';
import { seedData } from './seed';

export type AuthStatus = 'onboarding' | 'login' | 'app';
export type AccountsSegment = 'bank' | 'bills';
export type SheetName = 'expense' | 'addCard' | 'addAccount' | 'addGoal' | 'deposit' | 'addBill' | 'changePassword' | 'deleteAccount';

export interface NewExpense {
  amountCents: number;
  category: Category;
  sourceId: string;
  note: string;
  installments: number;
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
    selectedCardId: string | null;
    accountsSegment: AccountsSegment;
    /** meta alvo do sheet de depósito */
    depositGoalId: string | null;
  };

  // auth
  start: () => void;
  login: () => void;
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
  closeSheet: () => void;
  showToast: (message: string) => void;
  hideToast: () => void;
  selectCard: (id: string) => void;
  setAccountsSegment: (segment: AccountsSegment) => void;

  // domain
  addExpense: (input: NewExpense) => void;
  addCard: (input: NewCard) => void;
  addAccount: (input: NewAccount) => void;
  toggleBillPaid: (id: string) => void;
  addBill: (input: NewBill) => void;
  contributeToGoal: (id: string, amount: number) => void;
  addGoal: (input: NewGoal) => void;
  recordDeposit: (input: NewDeposit) => void;

  /** reseta para o seed (usado em testes) */
  reset: () => void;
}

const buildInitial = () => {
  const seed = seedData(now());
  return {
    auth: 'onboarding' as AuthStatus,
    ...seed,
    ui: { sheet: null, sheetNonce: 0, toast: null, selectedCardId: seed.cards[0]?.id ?? null, accountsSegment: 'bank' as AccountsSegment, depositGoalId: null },
  };
};

let toastTimer: ReturnType<typeof setTimeout> | null = null;
export const TOAST_DURATION_MS = 2200;

export const useKashStore = create<KashState>((set, get) => ({
  ...buildInitial(),

  start: () => set({ auth: 'login' }),
  login: () => set({ auth: 'app' }),
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

  openSheet: (sheet) => set((s) => ({ ui: { ...s.ui, sheet, sheetNonce: s.ui.sheetNonce + 1 } })),
  openDeposit: (goalId) => set((s) => ({ ui: { ...s.ui, sheet: 'deposit', sheetNonce: s.ui.sheetNonce + 1, depositGoalId: goalId } })),
  closeSheet: () => set((s) => ({ ui: { ...s.ui, sheet: null } })),
  showToast: (message) => {
    if (toastTimer) clearTimeout(toastTimer);
    set((s) => ({ ui: { ...s.ui, toast: message } }));
    toastTimer = setTimeout(() => get().hideToast(), TOAST_DURATION_MS);
  },
  hideToast: () => {
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = null;
    set((s) => ({ ui: { ...s.ui, toast: null } }));
  },
  selectCard: (id) => set((s) => ({ ui: { ...s.ui, selectedCardId: id } })),
  setAccountsSegment: (segment) => set((s) => ({ ui: { ...s.ui, accountsSegment: segment } })),

  addExpense: ({ amountCents, category, sourceId, note, installments }) => {
    const amount = amountCents / 100;
    if (amount <= 0) return;
    const isAccount = isAccountId(sourceId);
    const n = isAccount ? 1 : Math.max(1, installments);
    const per = round2(amount / n);
    const title = note.trim() || category;
    const today = toISODate(now());
    set((s) => ({
      txs: [{ id: createId('tx'), title: n > 1 ? `${title} (1/${n})` : title, category, amount: -per, date: today, sourceId }, ...s.txs],
      plans: n > 1 ? [...s.plans, { id: createId('plan'), title, category, cardId: sourceId, installments: n, current: 1, perInstallment: per }] : s.plans,
      accounts: isAccount ? s.accounts.map((a) => (a.id === sourceId ? { ...a, balance: round2(a.balance - amount) } : a)) : s.accounts,
      ui: { ...s.ui, sheet: null },
    }));
  },

  addCard: ({ name, last4, limit, closingDay, dueDay, gradientId }) => {
    const id = createId('card');
    const card: Card = { id, name: name.trim(), last4, limit, closingDay: closingDay ?? 1, dueDay: dueDay ?? 10, gradientId };
    set((s) => ({ cards: [...s.cards, card], ui: { ...s.ui, sheet: null, selectedCardId: id } }));
  },

  addAccount: ({ name, kind, bank, balance, color }) => {
    const account: Account = { id: createId('acc'), name: name.trim(), kind: bank.trim() ? `${kind} · ${bank.trim()}` : kind, balance, color };
    set((s) => ({ accounts: [...s.accounts, account], ui: { ...s.ui, sheet: null } }));
  },

  /**
   * Marcar como paga gera o lançamento da cobrança (fatura do cartão ou débito na conta);
   * desmarcar remove o lançamento e devolve o saldo.
   */
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
