import { round2 } from '../money';
import type { Account, Tx } from '../types';

export interface TransferLegs {
  /** perna de saída (valor negativo, conta de origem) */
  out: Tx;
  /** perna de entrada (valor positivo, conta de destino) */
  into: Tx;
}

/** As duas pernas de uma transferência, ou null se alguma não estiver nos dados. */
export function transferLegs(txs: Tx[], transferId: string): TransferLegs | null {
  const legs = txs.filter((t) => t.transferId === transferId);
  const out = legs.find((t) => t.amount < 0);
  const into = legs.find((t) => t.amount > 0);
  return out && into ? { out, into } : null;
}

export interface TransferPreview {
  fromAfter: number;
  toAfter: number;
  /** a origem fica negativa (permitido, mas vale avisar) */
  fromNegative: boolean;
}

/**
 * Saldos depois da transferência, para o formulário. Na edição, desfaz a transferência atual antes
 * de aplicar a nova (os saldos que chegam do servidor já a incluem).
 */
export function transferPreview(accounts: Account[], fromId: string, toId: string, amount: number, editing?: TransferLegs | null): TransferPreview {
  const balance = new Map(accounts.map((a) => [a.id, a.balance]));
  const add = (id: string, value: number) => balance.set(id, round2((balance.get(id) ?? 0) + value));
  if (editing) {
    add(editing.out.sourceId, Math.abs(editing.out.amount));
    add(editing.into.sourceId, -Math.abs(editing.into.amount));
  }
  add(fromId, -amount);
  add(toId, amount);
  const fromAfter = balance.get(fromId) ?? 0;
  return { fromAfter, toAfter: balance.get(toId) ?? 0, fromNegative: fromAfter < 0 };
}
