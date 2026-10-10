'use client';

import * as api from '@kash/supabase-client';
import { formatBRL, toISODate, type AccountKind, type Bill, type CardGradientId, type Category, type Settings, type Tx } from '@kash/domain';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { requireKashClient } from './client';
import { queryKeys } from './data';
import { buildNewTxRequest, buildTxUpdate, type TxFormValues } from './transactions';
import { toast, useUi } from './ui';

export interface CardFormValues {
  name: string;
  last4: string;
  limit: number;
  closingDay: number | null;
  dueDay: number | null;
  gradientId: CardGradientId;
  color: string | null;
}

export interface AccountFormValues {
  name: string;
  kind: AccountKind;
  bank: string;
  balance: number;
  color: string;
}

export interface BillFormValues {
  name: string;
  amount: number;
  dueDay: number;
  category: Category;
  sourceId: string | null;
}

export interface GoalFormValues {
  name: string;
  target: number;
  saved: number;
  monthly: number;
  color: string;
  accountId: string | null;
  depositDay: number | null;
}

type Snapshot = api.KashSnapshot;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Ações do app: chamam o servidor, avisam com toast e refazem o snapshot (o servidor é a verdade). */
export function createActions(qc: QueryClient) {
  const db = () => requireKashClient();
  const snapshot = (): Snapshot | undefined => qc.getQueriesData<Snapshot>({ queryKey: queryKeys.snapshotRoot }).find(([, d]) => d)?.[1];
  const refresh = () => qc.invalidateQueries({ queryKey: queryKeys.snapshotRoot });
  /** aplica uma mudança local imediata (desfeita pelo refetch se o servidor recusar) */
  const optimistic = (update: (s: Snapshot) => Snapshot) => qc.setQueriesData<Snapshot>({ queryKey: queryKeys.snapshotRoot }, (s) => (s ? update(s) : s));

  /** roda a escrita; true se deu certo. Erro vira toast com a mensagem pronta do client. */
  async function run<T>(task: () => Promise<T>, success?: string | ((result: T) => string)): Promise<T | undefined> {
    try {
      const result = await task();
      if (success) toast(typeof success === 'string' ? success : success(result));
      return result ?? (true as T);
    } catch (err) {
      toast(api.toKashError(err).message);
      return undefined;
    } finally {
      await refresh();
    }
  }
  const ok = (result: unknown) => result !== undefined;

  const sourceType = (id: string): 'card' | 'account' => (snapshot()?.cards.some((c) => c.id === id) ? 'card' : 'account');

  let lastDeleteGroup: string | null = null;

  const actions = {
    refresh,

    // lançamentos
    async addTransaction(values: TxFormValues) {
      const req = buildNewTxRequest(values, snapshot() ?? { cards: [], accounts: [] }, new Date());
      if (req.type === 'invalid') {
        toast(req.message);
        return false;
      }
      if (req.type === 'installments') {
        const { input, per, paid } = req;
        return ok(
          await run(
            () => api.addInstallmentPurchase(db(), input),
            paid > 0 ? `Parcela ${input.current}/${input.installments} lançada · ${paid} já pagas` : `${input.installments}x de ${formatBRL(per)} no cartão`,
          ),
        );
      }
      const { input } = req;
      const message = values.kind === 'income' ? `${formatBRL(input.amount)} de entrada registrados` : `${formatBRL(input.amount)} lançado em ${input.category}`;
      return ok(await run(() => api.createTransaction(db(), input), message));
    },
    async updateTransaction(tx: Tx, values: Pick<TxFormValues, 'amount' | 'category' | 'sourceId' | 'note' | 'date'>) {
      const { input, movePlanTo } = buildTxUpdate(tx, values, snapshot() ?? { cards: [] });
      return ok(
        await run(async () => {
          if (movePlanTo && tx.planId) await api.movePlanToCard(db(), tx.planId, movePlanTo);
          return api.updateTransaction(db(), tx.id, input);
        }, 'Lançamento atualizado'),
      );
    },
    async deleteTransaction(tx: Tx, scope: 'single' | 'plan') {
      const group = await run(() => api.softDeleteTransaction(db(), tx.id, scope));
      if (!group) return false;
      lastDeleteGroup = group;
      toast(tx.transferId ? 'Transferência excluída' : scope === 'plan' ? 'Parcelamento excluído' : 'Lançamento excluído', {
        label: 'Desfazer',
        onPress: () => {
          const g = lastDeleteGroup;
          lastDeleteGroup = null;
          useUi.getState().hideToast();
          if (g) void run(() => api.undoDeleteTransaction(db(), g), 'Lançamento restaurado');
        },
      });
      return true;
    },

    // transferências entre contas (as duas pernas vão juntas no servidor)
    async saveTransfer(transferId: string | null, input: api.TransferInput) {
      const label = `${formatBRL(input.amount)} transferidos`;
      if (transferId) return ok(await run(() => api.updateTransfer(db(), transferId, input), 'Transferência atualizada'));
      return ok(await run(() => api.createTransfer(db(), input), label));
    },

    // importação de fatura/extrato (as linhas já vêm revisadas)
    async importStatement(
      input: { target: { type: 'card' | 'account'; id: string }; fileName: string; format: 'pdf' | 'ofx' | 'csv'; statementMonth: string | null; items: Record<string, unknown>[]; keepBalance: boolean },
      rules: api.MerchantRuleRecord[],
    ): Promise<string | null> {
      const id = await run(async () => {
        const importId =
          input.target.type === 'card'
            ? await api.importCardStatement(db(), { cardId: input.target.id, fileName: input.fileName, format: input.format, statementMonth: input.statementMonth, items: input.items as api.CardImportItem[] })
            : await api.importAccountStatement(db(), { accountId: input.target.id, fileName: input.fileName, format: input.format, items: input.items, keepBalance: input.keepBalance });
        // regras aprendidas não podem derrubar a importação
        await api.saveMerchantRules(db(), rules).catch(() => undefined);
        return importId;
      });
      await qc.invalidateQueries({ queryKey: ['imports'] });
      return typeof id === 'string' ? id : null;
    },
    async undoImport(importId: string) {
      const done = ok(await run(() => api.undoImport(db(), importId), 'Importação desfeita'));
      await qc.invalidateQueries({ queryKey: ['imports'] });
      return done;
    },

    // cartões
    async saveCard(id: string | null, values: CardFormValues) {
      const input: api.CardInput = { ...values, closingDay: values.closingDay ?? 1, dueDay: values.dueDay ?? 10 };
      if (id) return ok(await run(() => api.updateCard(db(), id, input), 'Cartão atualizado'));
      const card = await run(() => api.createCard(db(), input), `Cartão “${values.name.trim()}” adicionado`);
      if (card && typeof card === 'object') useUi.getState().selectCard(card.id);
      return ok(card);
    },
    async deleteCard(id: string, name: string) {
      return ok(await run(() => api.deleteCard(db(), id), `Cartão “${name}” excluído`));
    },

    // contas
    async saveAccount(id: string | null, values: AccountFormValues) {
      const input: api.AccountInput = { name: values.name, kind: values.kind, institution: values.bank, balance: values.balance, color: values.color };
      if (id) return ok(await run(() => api.updateAccount(db(), id, input), 'Conta atualizada'));
      return ok(await run(() => api.createAccount(db(), input), `Conta “${values.name.trim()}” adicionada`));
    },
    async deleteAccount(id: string, name: string) {
      return ok(await run(() => api.deleteAccount(db(), id), `Conta “${name}” excluída`));
    },

    // contas fixas
    async saveBill(id: string | null, values: BillFormValues) {
      const input: api.BillInput = { name: values.name, amount: values.amount, dueDay: values.dueDay, category: values.category, source: values.sourceId ? { type: sourceType(values.sourceId), id: values.sourceId } : null };
      if (id) return ok(await run(() => api.updateBill(db(), id, input), 'Conta fixa atualizada'));
      return ok(await run(() => api.createBill(db(), input), `Conta fixa “${values.name.trim()}” adicionada`));
    },
    async deleteBill(id: string, name: string) {
      return ok(await run(() => api.deleteBill(db(), id), `Conta fixa “${name}” excluída`));
    },
    async toggleBillPaid(bill: Bill) {
      optimistic((s) => ({ ...s, bills: s.bills.map((b) => (b.id === bill.id ? { ...b, paid: !bill.paid } : b)) }));
      return ok(await run<unknown>(() => (bill.paid ? api.unpayBill(db(), bill.id) : api.payBill(db(), bill.id, toISODate(new Date()))), bill.paid ? `“${bill.name}” desmarcada` : `“${bill.name}” paga`));
    },

    // metas
    async saveGoal(id: string | null, values: GoalFormValues) {
      const input: api.GoalInput = { ...values, accountId: values.accountId ?? undefined };
      if (id) return ok(await run(() => api.updateGoal(db(), id, input), 'Meta atualizada'));
      return ok(await run(() => api.createGoal(db(), input), `Meta “${values.name.trim()}” criada`));
    },
    async deleteGoal(id: string, name: string) {
      return ok(await run(() => api.deleteGoal(db(), id), `Meta “${name}” excluída`));
    },
    /** atalho "+ Guardar R$ 50": soma na meta sem mexer em conta */
    async contributeToGoal(goalId: string, name: string, amount: number) {
      optimistic((s) => ({ ...s, goals: s.goals.map((g) => (g.id === goalId ? { ...g, saved: Math.min(g.target, g.saved + amount) } : g)) }));
      return ok(await run(() => api.recordGoalDeposit(db(), { goalId, amount }), `${formatBRL(amount)} guardados em “${name}”`));
    },
    async recordDeposit(goalId: string, name: string, amount: number, accountId: string | null) {
      return ok(await run(() => api.recordGoalDeposit(db(), { goalId, amount, accountId: accountId ?? undefined }), `${formatBRL(amount)} depositado em “${name}”`));
    },

    // faturas
    async payInvoice(invoiceId: string, accountId: string, label: string) {
      return ok(await run(() => api.payInvoice(db(), { invoiceId, accountId }), label));
    },

    // categorias
    async saveCategory(id: string | null, input: api.CategoryInput, renamedUsage?: { txs: number; bills: number; plans: number }) {
      if (id) {
        const usage = renamedUsage ? describeUsage(renamedUsage) : '';
        return ok(await run(() => api.updateCategory(db(), id, input), usage ? `Categoria renomeada · ${usage} atualizados` : 'Categoria atualizada'));
      }
      return ok(await run(() => api.createCategory(db(), input), `Categoria “${input.name}” criada`));
    },
    async deleteCategory(id: string, name: string, moveTo?: string, usage?: { txs: number; bills: number; plans: number }) {
      const message = moveTo && usage ? `“${name}” excluída · ${describeUsage(usage)} foram para ${moveTo}` : `Categoria “${name}” excluída`;
      return ok(await run(() => api.deleteCategory(db(), id, moveTo), message));
    },

    // perfil e preferências
    async updateUser(input: { name: string; phone: string }) {
      optimistic((s) => ({ ...s, user: { ...s.user, name: input.name.trim(), phone: input.phone.trim() } }));
      return ok(await run(() => api.updateUser(db(), input), 'Dados atualizados'));
    },
    async updateSettings(patch: Partial<Settings>, success?: string) {
      optimistic((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
      if (patch.theme) rememberTheme(patch.theme);
      return ok(await run(() => api.updateSettings(db(), patch), success));
    },
    /** devolve a mensagem de erro ou null */
    async changePassword(currentPassword: string, newPassword: string): Promise<string | null> {
      try {
        await api.changePassword(db(), { currentPassword, newPassword });
        toast('Senha alterada');
        return null;
      } catch (err) {
        return api.toKashError(err).message;
      }
    },
    async exportData() {
      const data = await run(() => api.exportMyData(db()));
      if (!data || typeof data !== 'object') return false;
      downloadJson(data, `kash-export-${toISODate(new Date())}.json`);
      toast('Arquivo baixado');
      return true;
    },
    async signOut() {
      try {
        await api.signOut(db());
      } catch {
        // sem rede: a sessão local já foi descartada pelo supabase-js
      }
      qc.clear();
      useUi.getState().reset();
    },
    async deleteOwnAccount() {
      try {
        await api.deleteOwnAccount(db());
      } catch (err) {
        toast(api.toKashError(err).message);
        return false;
      }
      qc.clear();
      useUi.getState().reset();
      toast('Conta excluída');
      return true;
    },
  };
  return actions;
}

export type KashActions = ReturnType<typeof createActions>;

export function useKashActions(): KashActions {
  const qc = useQueryClient();
  return useMemo(() => createActions(qc), [qc]);
}

export function describeUsage(u: { txs: number; bills: number; plans: number }) {
  return [u.txs ? plural(u.txs, 'lançamento', 'lançamentos') : '', u.bills ? plural(u.bills, 'conta fixa', 'contas fixas') : '', u.plans ? plural(u.plans, 'parcelamento', 'parcelamentos') : '']
    .filter(Boolean)
    .join(', ');
}

/** Tema guardado no navegador para pintar a tela certa antes do snapshot chegar. */
export const THEME_STORAGE_KEY = 'kash-web-theme';

export function rememberTheme(theme: 'dark' | 'light') {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // armazenamento bloqueado: o tema vem do servidor no próximo carregamento
  }
}

function downloadJson(data: unknown, fileName: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
