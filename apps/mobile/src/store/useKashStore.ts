import { create } from 'zustand';
import { changePassword as apiChangePassword, deleteOwnAccount, getProfile, type KashSnapshot, RECOVERY_PATH, recoverSessionFromUrl, verifyRecoveryCode as apiVerifyRecoveryCode, requestPasswordReset as apiRequestPasswordReset, signIn as apiSignIn, signOut as apiSignOut, signUp as apiSignUp, toKashError, updatePassword } from '@kash/supabase-client';
import { biometricLockPreference } from '@/services/biometrics';
import { onboardingFlag } from '@/services/onboarding';
import { supabase } from '@/services/supabase';
import { queryClient } from '@/data/queryClient';
import type { CardGradient } from '@/design-system/tokens/colors';
import { addToGoal, installmentSchedule, isSameMonth, monthKey, recordDeposit, rollover, round2, seedData, toISODate, type Account, type Bill, type Card, type Category, type CategoryDef, type Goal, type Invoice, type Plan, type Settings, type ThemeMode, type Tx, type TxKind, type User } from '@kash/domain';
import { createId } from '@/lib/ids';
import { now } from '@/lib/clock';

/** 'booting' = ainda lendo a sessão guardada */
/** `recovery`: sessão aberta por link de recuperação; só a tela de nova senha fica acessível */
/** esquema do deep link (app.json → scheme) */
export const APP_SCHEME = 'kash';

export type AuthStatus = 'booting' | 'onboarding' | 'login' | 'recovery' | 'app';
/** estado de uma requisição de auth */
export type RequestStatus = 'idle' | 'loading' | 'error' | 'success';

export interface Credentials {
  email: string;
  password: string;
}
export interface SignUpInput extends Credentials {
  name: string;
}
export type AccountsSegment = 'bank' | 'bills';
export type SheetName = 'transfer' | 'expense' | 'addCard' | 'addAccount' | 'addGoal' | 'deposit' | 'addBill' | 'changePassword' | 'payInvoice' | 'deleteAccount' | 'category';

export interface NewTransaction {
  kind: TxKind;
  amountCents: number;
  category: Category;
  sourceId: string;
  note: string;
  installments: number;
  /** ISO date; default hoje */
  date?: string;
  /** compra parcelada: mês ("yyyy-mm") da 1ª parcela; no passado, as parcelas anteriores contam como pagas */
  firstInstallmentMonth?: string;
}

/** Transferência entre contas (valor em centavos; as duas pernas são criadas juntas). */
export interface NewTransfer {
  fromAccountId: string;
  toAccountId: string;
  amountCents: number;
  /** ISO date; default hoje */
  date?: string;
  note: string;
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

export type EditableKind = 'card' | 'account' | 'bill' | 'goal' | 'category';
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
  /** cor personalizada (#RRGGBB); null volta para o gradiente pronto */
  color?: string | null;
}

export interface NewAccount {
  name: string;
  kind: string;
  bank: string;
  balance: number;
  color: string;
}

export interface NewCategory {
  name: string;
  /** #RRGGBB */
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
  /** app bloqueado aguardando biometria (só com a preferência ligada neste aparelho) */
  locked: boolean;
  /** id do usuário logado (chave das queries) */
  userId: string | null;
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
  /** categorias do usuário, na ordem de exibição */
  categories: CategoryDef[];
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
    /** transferência em edição no sheet de transferência (null = nova) */
    transferId: string | null;
    /** fatura alvo do sheet de pagamento */
    payInvoiceId: string | null;
  };

  // auth
  /** lê a sessão guardada e decide a tela inicial; chamado uma vez no boot */
  bootstrapAuth: () => Promise<void>;
  start: () => void;
  signIn: (input: Credentials) => Promise<boolean>;
  signUp: (input: SignUpInput) => Promise<boolean>;
  requestPasswordReset: (email: string) => Promise<boolean>;
  /** código de recuperação digitado; true se válido (vai pra tela de nova senha) */
  verifyRecoveryCode: (email: string, code: string) => Promise<boolean>;
  /** deep link recebido pelo app; true se era um link de recuperação válido (vai pra tela de nova senha) */
  handleAuthUrl: (url: string) => Promise<boolean>;
  /** define a nova senha na sessão de recuperação e entra no app */
  completePasswordRecovery: (password: string) => Promise<boolean>;
  cancelPasswordRecovery: () => Promise<void>;
  /** troca a senha do usuário logado; devolve a mensagem de erro ou null */
  changePassword: (currentPassword: string, newPassword: string) => Promise<string | null>;
  resetAuthRequest: () => void;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<boolean>;
  /** carrega nome/e-mail/configurações do perfil remoto */
  loadProfile: () => Promise<void>;
  /** substitui os dados em memória pelo snapshot do servidor */
  hydrateFromServer: (snapshot: KashSnapshot) => void;

  // settings
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  toggleHideValues: () => void;
  toggleBillReminder: () => void;
  /** lembrete por e-mail (opt-in; o envio é do servidor) */
  toggleEmailReminder: () => void;
  /** liga/desliga o bloqueio por biometria neste aparelho (a confirmação biométrica fica no hook da tela) */
  setBiometrics: (enabled: boolean) => void;
  lock: () => void;
  unlock: () => void;
  setMonthlyBudget: (value: number) => void;
  updateUser: (input: Partial<User>) => void;

  // ui
  openSheet: (sheet: SheetName) => void;
  openDeposit: (goalId: string) => void;
  openTransaction: (txId: string) => void;
  /** sheet de transferência; com id, edita a existente */
  openTransfer: (transferId?: string) => void;
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
  addTransfer: (input: NewTransfer) => void;
  updateTransfer: (transferId: string, input: NewTransfer) => void;
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
  addCategory: (input: NewCategory) => void;
  /** renomeia/recolore; lançamentos, contas fixas e parcelamentos acompanham o novo nome */
  updateCategory: (id: string, input: NewCategory) => void;
  /** exclui; se estiver em uso, `moveTo` (nome de outra categoria) recebe os registros */
  removeCategory: (id: string, moveTo?: string) => void;
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
    auth: 'booting' as AuthStatus,
    locked: false,
    userId: null as string | null,
    authRequest: { status: 'idle' as RequestStatus, error: null },
    ...seed,
    ui: { sheet: null, sheetNonce: 0, toast: null, toastAction: null, editingTxId: null, lastDeleted: null, editing: null, dataStatus: 'ready' as DataStatus, selectedCardId: seed.cards[0]?.id ?? null, accountsSegment: 'bank' as AccountsSegment, depositGoalId: null, payInvoiceId: null, transferId: null },
  };
};

let toastTimer: ReturnType<typeof setTimeout> | null = null;
export const TOAST_DURATION_MS = 2200;
/** toasts com ação (Desfazer) ficam mais tempo */
export const TOAST_ACTION_DURATION_MS = 4500;

export const useKashStore = create<KashState>((set, get) => ({
  ...buildInitial(),

  bootstrapAuth: async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        // com o bloqueio ligado neste aparelho, o app abre trancado até a biometria
        const biometrics = await biometricLockPreference.get();
        set((s) => ({ auth: 'app', userId: data.session!.user.id, locked: biometrics, settings: { ...s.settings, biometrics } }));
        void get().loadProfile();
      } else {
        set({ auth: (await onboardingFlag.get()) ? 'login' : 'onboarding' });
      }
    } catch {
      set({ auth: 'onboarding' });
    }
    // sessão expirada/revogada em outro lugar → volta pro login
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') set((s) => (s.auth === 'app' ? { ...buildInitial(), auth: 'login' } : s));
      if (event === 'PASSWORD_RECOVERY') set((s) => ({ auth: 'recovery', userId: session?.user.id ?? s.userId, authRequest: { status: 'idle', error: null } }));
    });
  },
  start: () => {
    void onboardingFlag.set(true);
    set({ auth: 'login' });
  },
  resetAuthRequest: () => set({ authRequest: { status: 'idle', error: null } }),
  signIn: async (input) => {
    set({ authRequest: { status: 'loading', error: null } });
    try {
      const session = await apiSignIn(supabase, input);
      set({ auth: 'app', userId: session.user.id, authRequest: { status: 'success', error: null } });
      void get().loadProfile();
      return true;
    } catch (err) {
      set({ authRequest: { status: 'error', error: toKashError(err).message } });
      return false;
    }
  },
  signUp: async (input) => {
    set({ authRequest: { status: 'loading', error: null } });
    try {
      const session = await apiSignUp(supabase, input);
      if (!session) {
        set({ authRequest: { status: 'error', error: 'Confira seu e-mail pra confirmar a conta e depois entre.' } });
        return false;
      }
      set((s) => ({ auth: 'app', userId: session.user.id, user: { ...s.user, name: input.name.trim(), email: input.email.trim() }, authRequest: { status: 'success', error: null } }));
      void get().loadProfile();
      return true;
    } catch (err) {
      set({ authRequest: { status: 'error', error: toKashError(err).message } });
      return false;
    }
  },
  requestPasswordReset: async (email) => {
    set({ authRequest: { status: 'loading', error: null } });
    try {
      await apiRequestPasswordReset(supabase, email, `${APP_SCHEME}://${RECOVERY_PATH}`);
      set({ authRequest: { status: 'success', error: null } });
      return true;
    } catch (err) {
      set({ authRequest: { status: 'error', error: toKashError(err).message } });
      return false;
    }
  },
  verifyRecoveryCode: async (email, code) => {
    set({ authRequest: { status: 'loading', error: null } });
    try {
      const session = await apiVerifyRecoveryCode(supabase, email, code);
      set({ auth: 'recovery', userId: session.user.id, authRequest: { status: 'idle', error: null } });
      return true;
    } catch (err) {
      set({ authRequest: { status: 'error', error: toKashError(err).message } });
      return false;
    }
  },
  handleAuthUrl: async (url) => {
    try {
      const session = await recoverSessionFromUrl(supabase, url);
      if (!session) return false;
      set({ auth: 'recovery', userId: session.user.id, authRequest: { status: 'idle', error: null } });
      return true;
    } catch (err) {
      get().showToast(toKashError(err).message);
      return false;
    }
  },
  completePasswordRecovery: async (password) => {
    set({ authRequest: { status: 'loading', error: null } });
    try {
      await updatePassword(supabase, password);
      set({ auth: 'app', authRequest: { status: 'success', error: null } });
      void get().loadProfile();
      get().showToast('Senha alterada. Bem-vinda de volta!');
      return true;
    } catch (err) {
      set({ authRequest: { status: 'error', error: toKashError(err).message } });
      return false;
    }
  },
  cancelPasswordRecovery: async () => {
    try {
      await apiSignOut(supabase);
    } catch {
      // sessão local já descartada
    }
    set({ ...buildInitial(), auth: 'login' });
  },
  changePassword: async (currentPassword, newPassword) => {
    try {
      await apiChangePassword(supabase, { currentPassword, newPassword });
      return null;
    } catch (err) {
      return toKashError(err).message;
    }
  },
  logout: async () => {
    try {
      await apiSignOut(supabase);
    } catch {
      // sem rede: a sessão local já foi descartada pelo supabase-js
    }
    queryClient.clear();
    // outra pessoa pode entrar neste aparelho: o bloqueio volta a ser opt-in
    void biometricLockPreference.set(false);
    set({ ...buildInitial(), auth: 'login' });
  },
  deleteAccount: async () => {
    try {
      await deleteOwnAccount(supabase);
    } catch (err) {
      get().showToast(toKashError(err).message);
      return false;
    }
    await onboardingFlag.set(false);
    queryClient.clear();
    set({ ...buildInitial(), auth: 'onboarding' });
    get().showToast('Conta excluída');
    return true;
  },
  hydrateFromServer: (snap) =>
    set((s) => ({
      user: snap.user,
      // biometria é preferência deste aparelho: o servidor não manda nela
      settings: { ...s.settings, ...snap.settings, biometrics: s.settings.biometrics },
      lastRolloverMonth: snap.lastRolloverMonth,
      accounts: snap.accounts,
      cards: snap.cards,
      txs: snap.txs,
      plans: snap.plans,
      bills: snap.bills,
      goals: snap.goals,
      // cache persistida por uma versão antiga do app pode não ter categorias: mantém as atuais
      categories: snap.categories?.length ? snap.categories : s.categories,
      invoices: snap.invoices,
      ui: { ...s.ui, selectedCardId: s.ui.selectedCardId && snap.cards.some((c) => c.id === s.ui.selectedCardId) ? s.ui.selectedCardId : (snap.cards[0]?.id ?? null) },
    })),

  loadProfile: async () => {
    try {
      const profile = await getProfile(supabase);
      set((s) => ({ user: profile.user, settings: { ...s.settings, ...profile.settings, biometrics: s.settings.biometrics } }));
    } catch {
      // perfil indisponível (offline): mantém o que está em memória
    }
  },

  setTheme: (theme) => set((s) => ({ settings: { ...s.settings, theme } })),
  toggleTheme: () => set((s) => ({ settings: { ...s.settings, theme: s.settings.theme === 'dark' ? 'light' : 'dark' } })),
  toggleHideValues: () => set((s) => ({ settings: { ...s.settings, hideValues: !s.settings.hideValues } })),
  toggleBillReminder: () => set((s) => ({ settings: { ...s.settings, billReminder: !s.settings.billReminder } })),
  toggleEmailReminder: () => set((s) => ({ settings: { ...s.settings, emailReminder: !s.settings.emailReminder } })),
  setBiometrics: (enabled) => {
    void biometricLockPreference.set(enabled);
    set((s) => ({ settings: { ...s.settings, biometrics: enabled } }));
  },
  lock: () => set((s) => (s.auth === 'app' && s.settings.biometrics ? { locked: true } : s)),
  unlock: () => set({ locked: false }),
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
    const sheet: SheetName = ref.kind === 'card' ? 'addCard' : ref.kind === 'account' ? 'addAccount' : ref.kind === 'bill' ? 'addBill' : ref.kind === 'category' ? 'category' : 'addGoal';
    set((s) => ({ ui: { ...s.ui, sheet, sheetNonce: s.ui.sheetNonce + 1, editing: ref } }));
  },
  setDataStatus: (status) => set((s) => ({ ui: { ...s.ui, dataStatus: status } })),
  openTransaction: (txId) =>
    set((s) => {
      // transferência abre o próprio sheet (edita as duas pernas juntas)
      const transferId = s.txs.find((t) => t.id === txId)?.transferId;
      if (transferId) return { ui: { ...s.ui, sheet: 'transfer', sheetNonce: s.ui.sheetNonce + 1, transferId } };
      return { ui: { ...s.ui, sheet: 'expense', sheetNonce: s.ui.sheetNonce + 1, editingTxId: txId } };
    }),
  openTransfer: (transferId) => set((s) => ({ ui: { ...s.ui, sheet: 'transfer', sheetNonce: s.ui.sheetNonce + 1, transferId: transferId ?? null } })),
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

  addTransaction: ({ kind, amountCents, category, sourceId, note, installments, date, firstInstallmentMonth }) => {
    const amount = amountCents / 100;
    if (amount <= 0) return;
    const isAccount = get().accounts.some((a) => a.id === sourceId);
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
    const title = note.trim() || category;
    // parcelado com a 1ª parcela no passado: lança só a parcela do mês atual (as anteriores já foram pagas)
    const schedule = installmentSchedule(amount, n, firstInstallmentMonth ?? monthKey(now()), now());
    if (n > 1 && schedule.finished) return;
    const per = n > 1 ? schedule.per : amount;
    const current = n > 1 ? schedule.current : 1;
    const txDate = current > 1 && !isSameMonth(when, now()) ? toISODate(new Date(now().getFullYear(), now().getMonth(), 1)) : when;
    const planId = n > 1 ? createId('plan') : undefined;
    set((s) => ({
      txs: [{ id: createId('tx'), title: n > 1 ? `${title} (${current}/${n})` : title, category, amount: -per, date: txDate, sourceId, planId }, ...s.txs],
      plans: planId ? [...s.plans, { id: planId, title, category, cardId: sourceId, installments: n, current, perInstallment: per }] : s.plans,
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
      // parcela trocada de cartão: o parcelamento inteiro (e as outras parcelas) vai junto
      const plan = tx.planId ? s.plans.find((p) => p.id === tx.planId) : undefined;
      const movesPlan = !!plan && next.sourceId !== tx.sourceId && s.cards.some((c) => c.id === next.sourceId);
      if (plan && !movesPlan) next.sourceId = tx.sourceId; // parcela não vai para conta bancária
      const accounts = s.accounts.map((a) => {
        let balance = a.balance;
        if (a.id === tx.sourceId) balance -= tx.amount;
        if (a.id === next.sourceId) balance += next.amount;
        return balance === a.balance ? a : { ...a, balance: round2(balance) };
      });
      const txs = s.txs.map((t) => (t.id === id ? next : movesPlan && t.planId === plan!.id ? { ...t, sourceId: next.sourceId } : t));
      const plans = movesPlan ? s.plans.map((p) => (p.id === plan!.id ? { ...p, cardId: next.sourceId } : p)) : s.plans;
      return { txs, plans, accounts, ui: { ...s.ui, sheet: null } };
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
      // transferência: as duas pernas saem juntas, como no servidor
      const removing = tx.transferId ? s.txs.filter((t) => t.transferId === tx.transferId) : plan && scope === 'plan' ? s.txs.filter((t) => t.planId === plan.id) : [tx];
      const removedIds = new Set(removing.map((t) => t.id));
      const accounts = s.accounts.map((a) => {
        const delta = removing.filter((t) => t.sourceId === a.id).reduce((sum, t) => sum + t.amount, 0);
        return delta === 0 ? a : { ...a, balance: round2(a.balance - delta) };
      });
      const bills = s.bills.map((b) => (b.paidTxId && removedIds.has(b.paidTxId) ? { ...b, paid: false, paidTxId: undefined } : b));
      const invoices = s.invoices.map((i) => (i.paidTxId && removedIds.has(i.paidTxId) ? { ...i, paid: false, paidTxId: undefined, paidAt: undefined } : i));
      // excluir o parcelamento tira o plano; excluir uma parcela não mexe no contador
      // (a próxima segue a numeração), igual ao servidor
      const plans = plan && scope === 'plan' ? s.plans.filter((p) => p.id !== plan.id) : s.plans;
      return {
        txs: s.txs.filter((t) => !removedIds.has(t.id)),
        accounts,
        bills,
        invoices,
        plans,
        ui: { ...s.ui, sheet: null, editingTxId: null, lastDeleted: { txs: removing, plan, accounts: s.accounts, bills: s.bills, invoices: s.invoices } },
      };
    }),

  addTransfer: ({ fromAccountId, toAccountId, amountCents, date, note }) => {
    const amount = round2(amountCents / 100);
    const s0 = get();
    if (!(amount > 0) || fromAccountId === toAccountId || !s0.accounts.some((a) => a.id === fromAccountId) || !s0.accounts.some((a) => a.id === toAccountId)) return;
    const transferId = createId('transfer');
    const when = date ?? toISODate(now());
    const title = note.trim() || 'Transferência';
    set((s) => ({
      txs: [
        { id: createId('tx'), title, category: 'Transferência', amount: -amount, date: when, sourceId: fromAccountId, sourceType: 'account', transferId },
        { id: createId('tx'), title, category: 'Transferência', amount, date: when, sourceId: toAccountId, sourceType: 'account', transferId },
        ...s.txs,
      ],
      accounts: s.accounts.map((a) => (a.id === fromAccountId ? { ...a, balance: round2(a.balance - amount) } : a.id === toAccountId ? { ...a, balance: round2(a.balance + amount) } : a)),
      ui: { ...s.ui, sheet: null, transferId: null },
    }));
  },

  updateTransfer: (transferId, { fromAccountId, toAccountId, amountCents, date, note }) =>
    set((s) => {
      const out = s.txs.find((t) => t.transferId === transferId && t.amount < 0);
      const into = s.txs.find((t) => t.transferId === transferId && t.amount > 0);
      const amount = round2(amountCents / 100);
      if (!out || !into || !(amount > 0) || fromAccountId === toAccountId) return s;
      const title = note.trim() || 'Transferência';
      const when = date ?? out.date;
      // desfaz a transferência antiga nos saldos e aplica a nova
      const delta = new Map<string, number>();
      const add = (id: string, v: number) => delta.set(id, (delta.get(id) ?? 0) + v);
      add(out.sourceId, -out.amount);
      add(into.sourceId, -into.amount);
      add(fromAccountId, -amount);
      add(toAccountId, amount);
      return {
        txs: s.txs.map((t) => (t.id === out.id ? { ...t, title, amount: -amount, date: when, sourceId: fromAccountId } : t.id === into.id ? { ...t, title, amount, date: when, sourceId: toAccountId } : t)),
        accounts: s.accounts.map((a) => (delta.has(a.id) ? { ...a, balance: round2(a.balance + delta.get(a.id)!) } : a)),
        ui: { ...s.ui, sheet: null, transferId: null },
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

  addCard: ({ name, last4, limit, closingDay, dueDay, gradientId, color }) => {
    const id = createId('card');
    const card: Card = { id, name: name.trim(), last4, limit, closingDay: closingDay ?? 1, dueDay: dueDay ?? 10, gradientId, ...(color ? { color } : {}) };
    set((s) => ({ cards: [...s.cards, card], ui: { ...s.ui, sheet: null, selectedCardId: id } }));
  },

  updateCard: (id, { name, last4, limit, closingDay, dueDay, gradientId, color }) =>
    set((s) => ({
      cards: s.cards.map((c) => (c.id === id ? { ...c, name: name.trim() || c.name, last4: last4 || c.last4, limit: limit > 0 ? limit : c.limit, closingDay: closingDay ?? c.closingDay, dueDay: dueDay ?? c.dueDay, gradientId, color: color ?? undefined } : c)),
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
        const debit = bill.sourceId && s.accounts.some((a) => a.id === bill.sourceId) ? bill.sourceId : null;
        return {
          bills: s.bills.map((b) => (b.id === id ? { ...b, paid: true, paidTxId: txId } : b)),
          txs: [tx, ...s.txs],
          accounts: debit ? s.accounts.map((a) => (a.id === debit ? { ...a, balance: round2(a.balance - bill.amount) } : a)) : s.accounts,
        };
      }
      const paidTx = bill.paidTxId ? s.txs.find((t) => t.id === bill.paidTxId) : undefined;
      const refund = paidTx && s.accounts.some((a) => a.id === paidTx.sourceId) ? paidTx.sourceId : null;
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

  addCategory: ({ name, color }) =>
    set((s) => ({ categories: [...s.categories, { id: createId('cat'), name: name.trim(), color }], ui: { ...s.ui, sheet: null, editing: null } })),

  updateCategory: (id, { name, color }) =>
    set((s) => {
      const current = s.categories.find((c) => c.id === id);
      if (!current) return s;
      const next = name.trim() || current.name;
      const renamed = next !== current.name;
      const old = current.name;
      return {
        categories: s.categories.map((c) => (c.id === id ? { ...c, name: next, color } : c)),
        // mesmo efeito da RPC update_category: o nome antigo some de todo lugar
        txs: renamed ? s.txs.map((t) => (t.category === old ? { ...t, category: next, title: t.title === old ? next : t.title } : t)) : s.txs,
        bills: renamed ? s.bills.map((b) => (b.category === old ? { ...b, category: next } : b)) : s.bills,
        plans: renamed ? s.plans.map((p) => (p.category === old ? { ...p, category: next, title: p.title === old ? next : p.title } : p)) : s.plans,
        ui: { ...s.ui, sheet: null, editing: null },
      };
    }),

  removeCategory: (id, moveTo) =>
    set((s) => {
      const current = s.categories.find((c) => c.id === id);
      if (!current || s.categories.length <= 1) return s;
      const name = current.name;
      const target = moveTo && moveTo !== name && s.categories.some((c) => c.name === moveTo) ? moveTo : null;
      const inUse = s.txs.some((t) => t.category === name) || s.bills.some((b) => b.category === name) || s.plans.some((p) => p.category === name);
      if (inUse && !target) return s;
      return {
        categories: s.categories.filter((c) => c.id !== id),
        txs: target ? s.txs.map((t) => (t.category === name ? { ...t, category: target } : t)) : s.txs,
        bills: target ? s.bills.map((b) => (b.category === name ? { ...b, category: target } : b)) : s.bills,
        plans: target ? s.plans.map((p) => (p.category === name ? { ...p, category: target } : p)) : s.plans,
        ui: { ...s.ui, sheet: null, editing: null },
      };
    }),

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
