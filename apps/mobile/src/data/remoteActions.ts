/**
 * Persistência das ações do store no Supabase.
 * O store continua aplicando a mudança localmente (passo otimista); aqui cada ação ganha um "depois"
 * que envia a mudança ao servidor via @kash/supabase-client e refaz o snapshot (ver `persist`).
 * Manter o mapeamento fora do store deixa a lógica local testável sem rede e a remota testável com mocks.
 */
import { ACCOUNT_KINDS, type AccountKind, type Category, type SourceType } from '@kash/domain';
import * as api from '@kash/supabase-client';
import { supabase } from '@/services/supabase';
import { useKashStore, type KashState } from '@/store';
import { persist, type PersistOptions } from './persist';
import { DATA_SOURCE } from './source';

type State = KashState;
type AnyFn = (...args: any[]) => any;
type ActionName = { [K in keyof State]: State[K] extends AnyFn ? K : never }[keyof State];

/** tipo da origem pelo que existe no estado (ids do servidor não têm prefixo) */
const sourceTypeOf = (s: State, id: string): SourceType => (s.cards.some((c) => c.id === id) ? 'card' : 'account');

/** "Poupança · Banco X" → { kind, institution } */
export function splitAccountKind(kind: string): { kind: AccountKind; institution: string } {
  const [k, ...rest] = kind.split(' · ');
  const known = ACCOUNT_KINDS.find((x) => x === k) ?? 'Conta corrente';
  return { kind: known, institution: rest.join(' · ') };
}

let lastDeleteGroup: string | null = null;
let installed = false;
/** ações originais (locais), para desinstalar nos testes sem empilhar wrappers */
const originals: Partial<State> = {};

interface WrapOptions extends PersistOptions {
  /** não executa a versão local (o servidor faz o trabalho e o snapshot traz o resultado) */
  replaceLocal?: boolean;
}

function wrap<K extends ActionName>(
  name: K,
  remote: (args: Parameters<Extract<State[K], AnyFn>>, before: State, after: State) => Promise<unknown> | undefined,
  options: WrapOptions = {},
) {
  const original = useKashStore.getState()[name] as AnyFn;
  (originals as Record<string, unknown>)[name] = original;
  const toast = (message: string) => useKashStore.getState().showToast(message);
  const wrapped: AnyFn = (...args) => {
    const before = useKashStore.getState();
    const result = options.replaceLocal ? undefined : original(...args);
    const after = useKashStore.getState();
    const task = remote(args as Parameters<Extract<State[K], AnyFn>>, before, after);
    if (task) void persist(() => task, { onError: options.onError ?? toast, onSuccess: options.onSuccess });
    return result;
  };
  useKashStore.setState({ [name]: wrapped } as Partial<State>);
}

const today = () => new Date().toISOString().slice(0, 10);

/** Liga as ações do store ao servidor. Idempotente; no modo `seed` não faz nada. */
export function installRemoteActions() {
  if (installed || DATA_SOURCE !== 'remote') return;
  installed = true;
  const db = supabase;

  // lançamentos
  wrap('addTransaction', ([input], before, after) => {
    const amount = input.amountCents / 100;
    if (amount <= 0) return undefined;
    const sourceType = sourceTypeOf(before, input.sourceId);
    if (input.kind === 'income') {
      if (sourceType !== 'account') return undefined;
      return api.createTransaction(db, { title: input.note.trim() || 'Entrada', category: 'Entrada', amount, date: input.date ?? today(), sourceType, sourceId: input.sourceId });
    }
    const title = input.note.trim() || input.category;
    if (sourceType === 'card' && input.installments > 1) {
      // o store já calculou qual parcela cai neste mês (e a data dela); o servidor recebe o mesmo
      const plan = after.plans.find((p) => !before.plans.some((b) => b.id === p.id));
      if (!plan) return undefined; // compra já quitada: nada a lançar
      const tx = after.txs.find((t) => t.planId === plan.id);
      return api.addInstallmentPurchase(db, { title, category: input.category, cardId: input.sourceId, total: amount, installments: input.installments, date: tx?.date ?? input.date, current: plan.current });
    }
    return api.createTransaction(db, { title, category: input.category, amount, date: input.date ?? today(), sourceType, sourceId: input.sourceId });
  });
  wrap('updateTransaction', async ([id], before, after) => {
    const tx = after.txs.find((t) => t.id === id);
    if (!tx) return undefined;
    // parcela que mudou de cartão: move o parcelamento inteiro antes de salvar o resto
    const old = before.txs.find((t) => t.id === id);
    if (tx.planId && old && old.sourceId !== tx.sourceId) await api.movePlanToCard(db, tx.planId, tx.sourceId);
    const category: Category | 'Entrada' | undefined = tx.category === 'Fatura' ? undefined : tx.category;
    return api.updateTransaction(db, id, { title: tx.title, amount: Math.abs(tx.amount), date: tx.date, sourceType: sourceTypeOf(after, tx.sourceId), sourceId: tx.sourceId, ...(category ? { category } : {}) });
  });
  wrap('deleteTransaction', ([id, scope]) => api.softDeleteTransaction(db, id, scope ?? 'single'), {
    onSuccess: (group) => {
      lastDeleteGroup = typeof group === 'string' ? group : null;
    },
  });
  wrap('undoDelete', () => {
    const group = lastDeleteGroup;
    lastDeleteGroup = null;
    return group ? api.undoDeleteTransaction(db, group) : undefined;
  });

  // cartões
  wrap('addCard', ([input]) => api.createCard(db, { name: input.name, last4: input.last4, limit: input.limit, closingDay: input.closingDay ?? 1, dueDay: input.dueDay ?? 10, gradientId: input.gradientId, color: input.color ?? null }), {
    onSuccess: (card) => {
      const id = (card as { id?: string } | undefined)?.id;
      if (id) useKashStore.setState((s) => ({ ui: { ...s.ui, selectedCardId: id } }));
    },
  });
  wrap('updateCard', ([id, input]) => api.updateCard(db, id, { name: input.name, last4: input.last4, limit: input.limit, closingDay: input.closingDay ?? 1, dueDay: input.dueDay ?? 10, gradientId: input.gradientId, color: input.color ?? null }));
  wrap('removeCard', ([id]) => api.deleteCard(db, id));

  // contas
  wrap('addAccount', ([input]) => api.createAccount(db, { name: input.name, kind: input.kind as AccountKind, institution: input.bank, balance: input.balance, color: input.color }));
  wrap('updateAccount', ([id, input]) => api.updateAccount(db, id, { name: input.name, kind: input.kind as AccountKind, institution: input.bank, balance: input.balance, color: input.color }));
  wrap('removeAccount', ([id]) => api.deleteAccount(db, id));

  // contas fixas
  wrap('toggleBillPaid', ([id], before) => {
    const bill = before.bills.find((b) => b.id === id);
    if (!bill) return undefined;
    return bill.paid ? api.unpayBill(db, id) : api.payBill(db, id);
  });
  wrap('addBill', ([input], before) => api.createBill(db, { name: input.name, amount: input.amount, dueDay: input.dueDay, category: input.category, source: input.sourceId ? { type: sourceTypeOf(before, input.sourceId), id: input.sourceId } : null }));
  wrap('updateBill', ([id, input], before) => api.updateBill(db, id, { name: input.name, amount: input.amount, dueDay: input.dueDay, category: input.category, source: input.sourceId ? { type: sourceTypeOf(before, input.sourceId), id: input.sourceId } : null }));
  wrap('removeBill', ([id]) => api.deleteBill(db, id));

  // metas
  wrap('addGoal', ([input]) => api.createGoal(db, { name: input.name, target: input.target, saved: input.saved, monthly: input.monthly, color: input.color, accountId: input.accountId, depositDay: input.depositDay ?? null }));
  wrap('updateGoal', ([id, input]) => api.updateGoal(db, id, { name: input.name, target: input.target, saved: input.saved, monthly: input.monthly, color: input.color, accountId: input.accountId, depositDay: input.depositDay ?? null }));
  wrap('removeGoal', ([id]) => api.deleteGoal(db, id));

  // categorias (renomear/excluir em cascata acontece na RPC; o snapshot traz o resultado)
  wrap('addCategory', ([input]) => api.createCategory(db, input));
  wrap('updateCategory', ([id, input]) => api.updateCategory(db, id, input));
  wrap('removeCategory', ([id, moveTo]) => api.deleteCategory(db, id, moveTo));
  wrap('contributeToGoal', ([id, amount]) => api.recordGoalDeposit(db, { goalId: id, amount }));
  wrap('recordDeposit', ([input]) => api.recordGoalDeposit(db, { goalId: input.goalId, amount: input.amountCents / 100, accountId: input.accountId }));

  // faturas e virada de mês
  wrap('payInvoice', ([invoiceId, accountId]) => api.payInvoice(db, { invoiceId, accountId }));
  wrap('rolloverIfNeeded', () => api.ensureRollover(db), { replaceLocal: true });

  // perfil e preferências
  wrap('updateUser', ([input]) => api.updateUser(db, { name: input.name, phone: input.phone }));
  wrap('setMonthlyBudget', ([value]) => (value > 0 ? api.updateSettings(db, { monthlyBudget: value }) : undefined));
  wrap('setTheme', ([theme]) => api.updateSettings(db, { theme }));
  wrap('toggleTheme', (_args, _before, after) => api.updateSettings(db, { theme: after.settings.theme }));
  wrap('toggleHideValues', (_args, _before, after) => api.updateSettings(db, { hideValues: after.settings.hideValues }));
  wrap('toggleBillReminder', (_args, _before, after) => api.updateSettings(db, { billReminder: after.settings.billReminder }));
  // biometria é preferência do aparelho (não sincroniza)
}

/** Só para testes: desinstala (restaura as ações locais) para reinstalar com mocks novos. */
export function __resetRemoteActionsForTests() {
  useKashStore.setState({ ...originals });
  for (const key of Object.keys(originals)) delete (originals as Record<string, unknown>)[key];
  installed = false;
  lastDeleteGroup = null;
}
