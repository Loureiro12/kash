import type { CardGradientId, CategoryName } from './categories';

export type ID = string;

/** Categoria de gasto. "Entrada" é usada apenas em lançamentos positivos. */
/** Nome de uma categoria do usuário (ver `CategoryDef`). */
export type Category = CategoryName;
/** 'Fatura' = pagamento de fatura (saída da conta que não conta como gasto no relatório) */
/** Categoria de um lançamento: do usuário ou de sistema ('Entrada', 'Fatura'). */
export type TxCategory = string;

/** Categoria cadastrada pelo usuário. A ordem da lista é a ordem de exibição. */
export interface CategoryDef {
  id: ID;
  name: string;
  /** #RRGGBB */
  color: string;
}

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
  gradientId: CardGradientId;
  /** cor personalizada (#RRGGBB); quando existe, substitui o gradiente pronto */
  color?: string;
}

export type TxKind = 'expense' | 'income';
/** Onde um lançamento/conta fixa é cobrado. Ids do backend são uuid; o seed usa prefixos "acc"/"card". */
export type SourceType = 'account' | 'card';

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
  /** tipo da origem (preenchido pelo backend; no seed deriva do prefixo do id) */
  sourceType?: SourceType;
  /** parcela de um plano de parcelamento */
  planId?: ID;
}

export const txKind = (tx: Pick<Tx, 'amount'>): TxKind => (tx.amount < 0 ? 'expense' : 'income');

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
  sourceType?: SourceType;
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

/** Fatura fechada de um cartão num mês ("yyyy-mm"). */
export interface Invoice {
  id: ID;
  cardId: ID;
  /** mês de competência "yyyy-mm" */
  month: string;
  total: number;
  paid: boolean;
  paidTxId?: ID;
  /** ISO date do pagamento */
  paidAt?: string;
}

export type ThemeMode = 'dark' | 'light';

export interface Settings {
  theme: ThemeMode;
  hideValues: boolean;
  /** push de vencimentos no celular */
  billReminder: boolean;
  /** lembretes por e-mail (Kash web; opt-in, desligado por padrão) */
  emailReminder: boolean;
  monthlyBudget: number;
  /** entrar com Face ID / Touch ID */
  biometrics: boolean;
  /** código ISO da moeda de exibição (só BRL nesta fase) */
  currency: 'BRL';
}

export interface User {
  name: string;
  email: string;
  phone: string;
}

export type AccountKind = 'Conta corrente' | 'Poupança' | 'Carteira' | 'Investimento';
export const ACCOUNT_KINDS: AccountKind[] = ['Conta corrente', 'Poupança', 'Carteira', 'Investimento'];

/** Nomes das categorias padrão. */
export const CATEGORIES: Category[] = ['Comida', 'Transporte', 'Lazer', 'Mercado', 'Assinaturas', 'Outros'];

export const isCardId = (id: ID) => id.startsWith('card');
export const isAccountId = (id: ID) => id.startsWith('acc');

/** Tipo da origem de um lançamento/conta fixa, com fallback pelo prefixo do id (seed). */
export function sourceTypeOf(item: { sourceId?: ID; sourceType?: SourceType }): SourceType | null {
  if (item.sourceType) return item.sourceType;
  if (!item.sourceId) return null;
  return isCardId(item.sourceId) ? 'card' : isAccountId(item.sourceId) ? 'account' : null;
}
