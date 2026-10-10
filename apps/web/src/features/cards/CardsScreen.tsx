'use client';

import { formatBRL } from '@kash/domain';
import Link from 'next/link';
import { useMemo } from 'react';
import { Button, Card, CardHeader, CreditCardFace, DashedButton, EmptyState, ProgressBar, uiStyles } from '@/components/app/ui';
import { useKash } from '@/kash/data';
import { useUi } from '@/kash/ui';
import { cardsView } from '@/kash/views';
import { useMoney, useNow } from '@/features/app/hooks';
import { routes } from '@/features/app/nav';
import { PageHeader } from '@/features/app/PageHeader';
import { TxRow } from '@/features/app/TxRow';
import s from '@/features/app/screens.module.css';
import c from './CardsScreen.module.css';

/** Cartões: fileira de cartões, limite, fatura fechada, parcelas, cobranças e lançamentos. */
export function CardsScreen() {
  const snap = useKash();
  const now = useNow();
  const money = useMoney();
  const selectedId = useUi((st) => st.selectedCardId);
  const selectCard = useUi((st) => st.selectCard);
  const openModal = useUi((st) => st.openModal);
  const v = useMemo(() => cardsView(snap, selectedId, now), [snap, selectedId, now]);
  const sel = v.selected;

  return (
    <>
      <PageHeader
        title="Cartões"
        subtitle="Clique num cartão pra ver a fatura e as parcelas."
        actions={
          <Link href={routes.importer} className={`${uiStyles.btn} ${uiStyles.soft} ${uiStyles.sm}`} onClick={() => useUi.getState().setImportTarget(sel ? { type: 'card', id: sel.card.id } : { type: 'card', id: '' })} data-testid="cards-import">
            Importar fatura
          </Link>
        }
      />

      {v.list.length === 0 ? (
        <Card>
          <EmptyState
            icon="cards"
            title="Nenhum cartão ainda"
            text="Cadastre um cartão pra acompanhar a fatura, o limite e as parcelas."
            action={
              <Button size="sm" onClick={() => openModal({ name: 'card' })} testID="cards-empty-add">
                Adicionar cartão
              </Button>
            }
            testID="cards-empty-state"
          />
        </Card>
      ) : (
        <>
          <div className={c.row} role="radiogroup" aria-label="Seus cartões" data-testid="cards-row">
            {v.list.map(({ card, usage, dates }) => {
              const selected = sel?.card.id === card.id;
              return (
                <button key={card.id} type="button" role="radio" aria-checked={selected} className={c.pick} onClick={() => selectCard(card.id)} data-testid={`card-${card.id}`} aria-label={`${card.name}, final ${card.last4}, fatura atual ${money(usage.used)}`}>
                  <CreditCardFace name={card.name} gradientId={card.gradientId} color={card.color} caption="Fatura atual" amount={money(usage.used)} last4={card.last4} footerRight={`fecha ${dates.closes}`} className={c.face} />
                </button>
              );
            })}
            <DashedButton onClick={() => openModal({ name: 'card' })} testID="card-add" className={c.add}>
              Novo cartão
            </DashedButton>
          </div>

          {sel ? (
            <div className={s.grid2}>
              <div className={s.stack}>
                <Card className={s.cardColLg} testID="cards-limit">
                  <div className={s.between}>
                    <h2 className={uiStyles.cardTitle}>Limite usado · {sel.card.name}</h2>
                    <span style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                      <span className={s.label} data-testid="cards-limit-pct">
                        {sel.usage.pct}%
                      </span>
                      <button type="button" className={`${uiStyles.btn} ${uiStyles.link}`} onClick={() => openModal({ name: 'card', id: sel.card.id })} data-testid="card-edit">
                        Editar
                      </button>
                    </span>
                  </div>
                  <ProgressBar pct={sel.usage.pct} height={10} label="Limite usado" />
                  <div className={s.between} style={{ fontSize: 13 }}>
                    <span className={s.muted}>
                      Disponível{' '}
                      <b className={s.strong} data-testid="cards-available">
                        {money(sel.usage.available)}
                      </b>
                    </span>
                    <span className={s.muted}>Limite {formatBRL(sel.card.limit)}</span>
                  </div>
                  <div className={c.dates}>
                    <div className={c.dateBox}>
                      <span className={s.labelXs}>Fechamento</span>
                      <b>{sel.dates.closes}</b>
                    </div>
                    <div className={c.dateBox}>
                      <span className={s.labelXs}>Vencimento</span>
                      <b>{sel.dates.due}</b>
                    </div>
                  </div>
                </Card>

                {v.openInvoice ? (
                  <Card accent className={s.cardColLg} testID="cards-invoice-open">
                    <div className={s.between}>
                      <h2 className={uiStyles.cardTitle}>Fatura de {v.openInvoice.monthName} fechada</h2>
                      <span className={s.accentLink}>vence {v.openInvoice.dueLabel}</span>
                    </div>
                    <div className={s.between} style={{ alignItems: 'center' }}>
                      <span className={s.accentValue} data-testid="cards-invoice-total">
                        {money(v.openInvoice.total)}
                      </span>
                      <Button variant="inverse" size="sm" onClick={() => openModal({ name: 'payInvoice', invoiceId: v.openInvoice!.id })} testID="cards-invoice-pay">
                        Pagar fatura
                      </Button>
                    </div>
                  </Card>
                ) : v.lastPaidInvoice ? (
                  <p className={s.meta} style={{ margin: '0 4px' }} data-testid="cards-invoice-paid">
                    Fatura de {v.lastPaidInvoice.monthName} paga
                    {v.lastPaidInvoice.paidAt ? ` em ${v.lastPaidInvoice.paidAt.slice(8, 10)}/${v.lastPaidInvoice.paidAt.slice(5, 7)}` : ''} · {money(v.lastPaidInvoice.total)}
                  </p>
                ) : null}

                {v.plans.length > 0 ? (
                  <Card className={s.stackSm} testID="cards-plans">
                    <h2 className={uiStyles.cardTitle} style={{ marginBottom: 4 }}>
                      Parcelas em aberto
                    </h2>
                    {v.plans.map((p) => (
                      <div key={p.id} className={c.plan} data-testid={`plan-${p.id}`}>
                        <div className={s.between}>
                          <span className={uiStyles.rowTitle}>{p.title}</span>
                          <b style={{ fontSize: 13 }}>{formatBRL(p.perInstallment)}/mês</b>
                        </div>
                        <ProgressBar pct={p.pct} height={6} track="var(--line)" label={`Parcelas pagas de ${p.title}`} />
                        <div className={s.between}>
                          <span className={s.meta} data-testid={`plan-${p.id}-progress`}>
                            {p.current} de {p.installments} pagas
                          </span>
                          <span className={s.meta}>
                            termina em {p.endsIn} · falta {formatBRL(p.remaining)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </Card>
                ) : null}

                {v.bills.length > 0 ? (
                  <Card list testID="cards-bills">
                    <CardHeader title="Cobranças recorrentes" />
                    {v.bills.map((b) => (
                      <div key={b.id} className={uiStyles.row} data-testid={`card-bill-${b.id}`}>
                        <span className={uiStyles.rowText}>
                          <span className={uiStyles.rowTitle}>{b.name}</span>
                          <span className={uiStyles.rowMeta}>{b.paid ? 'Já na fatura deste mês' : `Todo dia ${b.dueDay}`}</span>
                        </span>
                        <span className={uiStyles.rowValue}>{formatBRL(b.amount)}</span>
                      </div>
                    ))}
                  </Card>
                ) : null}
              </div>

              <Card list testID="cards-txs">
                <CardHeader title="Lançamentos da fatura" />
                {v.txs.length === 0 ? (
                  <p className={s.emptyLine} data-testid="cards-empty">
                    Nenhum gasto nesse cartão ainda.
                  </p>
                ) : (
                  v.txs.map(({ view }) => <TxRow key={view.id} tx={view} testID={`card-tx-${view.id}`} />)
                )}
              </Card>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
