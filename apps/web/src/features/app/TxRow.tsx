'use client';

import type { TxView } from '@kash/domain';
import { uiStyles as s } from '@/components/app/ui';
import { withAlpha } from '@/components/app/colors';
import { useUi } from '@/kash/ui';
import { useMoney } from './hooks';

/** Linha de lançamento (ícone da categoria, título, meta e valor). Clique abre a edição. */
export function TxRow({ tx, testID }: { tx: TxView; testID?: string }) {
  const money = useMoney();
  const openModal = useUi((st) => st.openModal);
  const sign = tx.kind === 'transfer' ? '' : tx.isExpense ? '− ' : '+ ';
  const open = () => (tx.kind === 'transfer' && tx.transferId ? openModal({ name: 'transfer', transferId: tx.transferId }) : openModal({ name: 'transaction', txId: tx.id }));
  return (
    <button type="button" className={`${s.row} ${s.rowButton}`} onClick={open} data-testid={testID ?? `tx-${tx.id}`} aria-label={`${tx.title}, ${tx.meta}, ${sign}${money(Math.abs(tx.amount))}. Editar`}>
      <span className={s.tile} style={{ background: withAlpha(tx.color, 0.15), color: tx.color }} aria-hidden="true">
        {tx.initial}
      </span>
      <span className={s.rowText}>
        <span className={s.rowTitle}>{tx.title}</span>
        <span className={s.rowMeta}>{tx.meta}</span>
      </span>
      <span className={`${s.rowValue} ${tx.kind === 'income' ? s.pos : tx.kind === 'transfer' ? s.neutral : ''}`}>
        {sign}
        {money(Math.abs(tx.amount))}
      </span>
    </button>
  );
}
