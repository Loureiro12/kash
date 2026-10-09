import { installmentSchedule, isSameMonth, monthKey, toISODate, type Category, type Tx, type TxKind } from '@kash/domain';
import type { KashSnapshot, TxInput } from '@kash/supabase-client';

/** O que o formulário de lançamento entrega (valores já validados pela tela). */
export interface TxFormValues {
  kind: TxKind;
  /** valor total em reais (no parcelado, o total da compra) */
  amount: number;
  category: Category;
  sourceId: string;
  note: string;
  /** 1 = à vista */
  installments: number;
  /** ISO yyyy-mm-dd */
  date: string;
  /** parcelado: mês ("yyyy-mm") da 1ª parcela; no passado, as anteriores contam como pagas */
  firstInstallmentMonth?: string;
}

export interface InstallmentRequest {
  title: string;
  category: Category;
  cardId: string;
  total: number;
  installments: number;
  date: string;
  current: number;
}

/** Como um lançamento novo vira chamada ao servidor (mesmas regras do app mobile). */
export type TxRequest =
  | { type: 'single'; input: TxInput }
  | { type: 'installments'; input: InstallmentRequest; per: number; paid: number }
  | { type: 'invalid'; message: string };

const isCard = (snap: Pick<KashSnapshot, 'cards'>, id: string) => snap.cards.some((c) => c.id === id);

export function buildNewTxRequest(values: TxFormValues, snap: Pick<KashSnapshot, 'cards' | 'accounts'>, now: Date): TxRequest {
  const amount = Math.round(values.amount * 100) / 100;
  if (!(amount > 0)) return { type: 'invalid', message: 'Digite um valor maior que zero.' };
  const card = isCard(snap, values.sourceId);
  if (!card && !snap.accounts.some((a) => a.id === values.sourceId)) return { type: 'invalid', message: 'Escolha onde foi pago.' };

  if (values.kind === 'income') {
    if (card) return { type: 'invalid', message: 'Entradas vão para uma conta, não para o cartão.' };
    return { type: 'single', input: { title: values.note.trim() || 'Entrada', category: 'Entrada', amount, date: values.date, sourceType: 'account', sourceId: values.sourceId } };
  }

  const title = values.note.trim() || values.category;
  const n = card ? Math.max(1, Math.min(24, Math.floor(values.installments))) : 1;
  if (n > 1) {
    const schedule = installmentSchedule(amount, n, values.firstInstallmentMonth ?? monthKey(now), now);
    if (schedule.finished) return { type: 'invalid', message: 'Essa compra já foi toda paga: não há parcelas a lançar.' };
    // parcela de uma compra antiga: entra no mês atual (a data digitada pode ser de outro mês)
    const date = schedule.current > 1 && !isSameMonth(values.date, now) ? toISODate(new Date(now.getFullYear(), now.getMonth(), 1)) : values.date;
    return {
      type: 'installments',
      input: { title, category: values.category, cardId: values.sourceId, total: amount, installments: n, date, current: schedule.current },
      per: schedule.per,
      paid: schedule.paid,
    };
  }
  return { type: 'single', input: { title, category: values.category, amount, date: values.date, sourceType: card ? 'card' : 'account', sourceId: values.sourceId } };
}

/** Edição: o que muda no lançamento e se o parcelamento precisa trocar de cartão antes. */
export function buildTxUpdate(tx: Tx, values: Pick<TxFormValues, 'amount' | 'category' | 'sourceId' | 'note' | 'date'>, snap: Pick<KashSnapshot, 'cards'>) {
  const sourceType = isCard(snap, values.sourceId) ? 'card' : 'account';
  const category = tx.category === 'Fatura' ? undefined : tx.amount > 0 ? 'Entrada' : values.category;
  const input: Partial<TxInput> = {
    title: values.note.trim() || tx.title,
    amount: Math.abs(values.amount),
    date: values.date,
    sourceType,
    sourceId: values.sourceId,
    ...(category ? { category } : {}),
  };
  const movePlanTo = tx.planId && tx.sourceId !== values.sourceId && sourceType === 'card' ? values.sourceId : null;
  return { input, movePlanTo };
}
