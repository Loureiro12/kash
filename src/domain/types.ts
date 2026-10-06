import type { CardGradient, CategoryName } from '@/design-system/tokens/colors';

export type ID = string;

/** Categoria de gasto. "Entrada" é usada apenas em lançamentos positivos. */
export type Category = CategoryName;
export type TxCategory = Category | 'Entrada';

export interface Account {
  id: ID;
  name: string;
  /** descrição exibida (ex.: "Banco digital", "Poupança · Nubank") */
  kind: string;
  balance: number;
  color: string;
}

export interface Card {
  id: ID;
  name: string;
  last4: string;
  limit: number;
  /** dia do fechamento da fatura (1..31) */
  closingDay: number;
  /** dia do vencimento da fatura (1..31) */
  dueDay: number;
  gradientId: CardGradient['id'];
}

export interface Tx {
  id: ID;
  title: string;
  category: TxCategory;
  /** negativo = saída, positivo = entrada */
  amount: number;
  /** ISO date (yyyy-mm-dd) */
  date: string;
  /** Account.id ou Card.id */
  sourceId: ID;
}

/** Conta fixa mensal (recorrente). */
export interface Bill {
  id: ID;
  name: string;
  amount: number;
  dueDay: number;
  paid: boolean;
  /** categoria usada no lançamento gerado ao pagar */
  category: Category;
  /** onde a cobrança acontece: Card.id (entra na fatura) ou Account.id (debita o saldo) */
  sourceId?: ID;
  /** lançamento gerado ao marcar como paga neste mês (removido ao desmarcar) */
  paidTxId?: ID;
}

export interface Goal {
  id: ID;
  name: string;
  target: number;
  saved: number;
  color: string;
  /** aporte mensal estimado (para o ETA) e valor sugerido do depósito */
  monthly: number;
  /** conta onde o dinheiro da meta fica guardado */
  accountId?: ID;
  /** dia do mês do depósito (1..31) */
  depositDay?: number;
  /** ISO date do último depósito registrado */
  lastDepositDate?: string;
}

/** Plano de parcelamento no cartão. */
export interface Plan {
  id: ID;
  title: string;
  category: Category;
  cardId: ID;
  /** total de parcelas */
  installments: number;
  /** parcelas já lançadas */
  current: number;
  /** valor de cada parcela */
  perInstallment: number;
}

export type ThemeMode = 'dark' | 'light';

export interface Settings {
  theme: ThemeMode;
  hideValues: boolean;
  billReminder: boolean;
  monthlyBudget: number;
}

export interface User {
  name: string;
  email: string;
}

export type AccountKind = 'Conta corrente' | 'Poupança' | 'Carteira' | 'Investimento';
export const ACCOUNT_KINDS: AccountKind[] = ['Conta corrente', 'Poupança', 'Carteira', 'Investimento'];

export const CATEGORIES: Category[] = ['Comida', 'Transporte', 'Lazer', 'Mercado', 'Assinaturas', 'Outros'];

export const isCardId = (id: ID) => id.startsWith('card');
export const isAccountId = (id: ID) => id.startsWith('acc');
