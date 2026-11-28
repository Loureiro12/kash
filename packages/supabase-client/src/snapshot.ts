import type { Account, Bill, Card, CategoryDef, Debt, Goal, Household, Invoice, Plan, Settings, Tx, User } from '@kash/domain';
import type { KashClient } from './client';
import { listAccounts } from './repositories/accounts';
import { listBills } from './repositories/bills';
import { getCardUsage, listCards } from './repositories/cards';
import { listCategories } from './repositories/categories';
import { listDebts } from './repositories/debts';
import { listGoals } from './repositories/goals';
import { getHousehold } from './repositories/household';
import { listInvoices } from './repositories/invoices';
import { listPlans } from './repositories/plans';
import { getProfile } from './repositories/profile';
import { listTransactions } from './repositories/transactions';

/** Tudo que o app precisa para renderizar, em uma única leitura. */
export interface KashSnapshot {
  user: User;
  settings: Settings;
  lastRolloverMonth: string;
  /** categorias do usuário, na ordem de exibição */
  categories: CategoryDef[];
  accounts: Account[];
  cards: Card[];
  /** fatura atual por cartão (id → valor) */
  cardUsage: Record<string, number>;
  txs: Tx[];
  plans: Plan[];
  bills: Bill[];
  goals: Goal[];
  invoices: Invoice[];
  /** quem me deve (opcional: o snapshot guardado por versões antigas do app não tem) */
  debts?: Debt[];
  /** conta compartilhada do casal (opcional pelo mesmo motivo; null = não participa) */
  household?: Household | null;
  /** id de quem está logado (para saber o que é meu, do casal ou da outra pessoa) */
  userId?: string;
}

export interface SnapshotOptions {
  /** intervalo de lançamentos (ISO); default: últimos 12 meses */
  txRange?: { from: string; to: string };
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

/** Carrega o snapshot do usuário logado com as leituras em paralelo. */
export async function loadSnapshot(db: KashClient, options: SnapshotOptions = {}): Promise<KashSnapshot> {
  const now = new Date();
  const from = options.txRange?.from ?? isoDate(new Date(now.getFullYear(), now.getMonth() - 11, 1));
  const to = options.txRange?.to ?? isoDate(new Date(now.getFullYear(), now.getMonth() + 2, 0));
  const [profile, categories, accounts, cards, cardUsage, txs, plans, bills, goals, invoices, debts, household, auth] = await Promise.all([
    getProfile(db),
    listCategories(db),
    listAccounts(db),
    listCards(db),
    getCardUsage(db),
    listTransactions(db, { from, to }),
    listPlans(db),
    listBills(db),
    listGoals(db),
    listInvoices(db),
    listDebts(db),
    getHousehold(db),
    db.auth.getUser(),
  ]);
  return { user: profile.user, settings: profile.settings, lastRolloverMonth: profile.lastRolloverMonth, categories, accounts, cards, cardUsage, txs, plans, bills, goals, invoices, debts, household, userId: auth.data.user?.id };
}
