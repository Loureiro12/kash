'use client';

import { formatBRL } from '@kash/domain';
import { useMemo } from 'react';
import { Icon } from '@/components/app/Icon';
import { Button, Card, DashedButton, EmptyState } from '@/components/app/ui';
import { useKashActions } from '@/kash/actions';
import { useKash } from '@/kash/data';
import { useUi } from '@/kash/ui';
import { billsView } from '@/kash/views';
import { PageHeader } from '@/features/app/PageHeader';
import s from '@/features/app/screens.module.css';
import a from './accounts.module.css';

/** Contas fixas: KPIs e lista; clique marca como paga, o lápis edita. */
export function BillsScreen() {
  const snap = useKash();
  const actions = useKashActions();
  const openModal = useUi((st) => st.openModal);
  const v = useMemo(() => billsView(snap), [snap]);

  return (
    <>
      <PageHeader title="Contas fixas" subtitle="Clique numa conta pra marcar como paga." />
      {v.bills.length === 0 ? (
        <Card>
          <EmptyState
            icon="bills"
            title="Nenhuma conta fixa"
            text="Aluguel, internet, streaming: cadastre o que vence todo mês e nunca mais esqueça."
            action={
              <Button size="sm" onClick={() => openModal({ name: 'bill' })} testID="bills-empty-add">
                Nova conta fixa
              </Button>
            }
            testID="bills-empty-state"
          />
        </Card>
      ) : (
        <>
          <div className={s.kpis}>
            <Card className={s.cardCol}>
              <p className={s.labelXs}>A pagar este mês</p>
              <p className={`${s.mid} ${s.neg}`} data-testid="bills-pending">
                {formatBRL(v.summary.pendingTotal)}
              </p>
            </Card>
            <Card className={s.cardCol}>
              <p className={s.labelXs}>Pagas</p>
              <p className={`${s.mid} ${s.pos}`} data-testid="bills-paid-count">
                {v.summary.paidCount}/{v.summary.count}
              </p>
            </Card>
            <Card className={s.cardCol}>
              <p className={s.labelXs}>Total mensal</p>
              <p className={s.mid} data-testid="bills-total">
                {formatBRL(v.summary.total)}
              </p>
            </Card>
          </div>

          <Card className={a.bills} testID="bills-list">
            {v.bills.map(({ bill: b, sourceName }) => (
              <div key={b.id} className={`${a.billWrap} ${b.paid ? a.paid : ''}`}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={b.paid}
                  className={a.bill}
                  onClick={() => void actions.toggleBillPaid(b)}
                  data-testid={`bill-${b.id}`}
                  aria-label={`${b.name}, ${formatBRL(b.amount)}, ${b.paid ? 'paga' : `vence dia ${b.dueDay}`}${sourceName ? `, cobrada em ${sourceName}` : ''}`}
                >
                  <span className={a.check} aria-hidden="true">
                    <Icon name="check" size={13} strokeWidth={3.5} />
                  </span>
                  <span className={a.billText}>
                    <span className={a.billName}>{b.name}</span>
                    <span className={s.meta} data-testid={`bill-${b.id}-status`}>
                      {b.paid ? 'Paga' : `Vence dia ${b.dueDay}`}
                      {sourceName ? ` · ${sourceName}` : ''}
                    </span>
                  </span>
                  <span className={a.billAmount}>{formatBRL(b.amount)}</span>
                </button>
                <button type="button" className={a.edit} onClick={() => openModal({ name: 'bill', id: b.id })} aria-label={`Editar ${b.name}`} data-testid={`bill-${b.id}-edit`}>
                  <Icon name="pencil" size={16} />
                </button>
              </div>
            ))}
            <DashedButton onClick={() => openModal({ name: 'bill' })} testID="bills-add" plus={false} style={{ margin: '6px 0', borderRadius: 14 }}>
              + Nova conta fixa
            </DashedButton>
          </Card>
        </>
      )}
    </>
  );
}
