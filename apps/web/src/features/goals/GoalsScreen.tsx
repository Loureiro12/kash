'use client';

import { formatBRL } from '@kash/domain';
import { useMemo } from 'react';
import { Icon } from '@/components/app/Icon';
import { Button, Card, DashedButton, EmptyState, Ring } from '@/components/app/ui';
import { useKashActions } from '@/kash/actions';
import { useKash } from '@/kash/data';
import { useUi } from '@/kash/ui';
import { goalsView } from '@/kash/views';
import { useMoney, useNow } from '@/features/app/hooks';
import { PageHeader } from '@/features/app/PageHeader';
import s from '@/features/app/screens.module.css';
import g from './goals.module.css';

/** Valor do atalho "+ Guardar" (handoff). */
export const QUICK_CONTRIBUTION = 50;

/** Metas: anel de progresso, prazo, depósito do mês, atalho de R$ 50 e dica da semana. */
export function GoalsScreen() {
  const snap = useKash();
  const now = useNow();
  const money = useMoney();
  const actions = useKashActions();
  const openModal = useUi((st) => st.openModal);
  const v = useMemo(() => goalsView(snap, now), [snap, now]);

  return (
    <>
      <PageHeader
        title="Metas"
        subtitle={
          <>
            Guarde um pouco por vez e veja o progresso crescer. Você já guardou{' '}
            <b className={s.pos} data-testid="goals-total">
              {money(v.totalSaved)}
            </b>{' '}
            no total.
          </>
        }
      />
      {v.goals.length === 0 ? (
        <Card>
          <EmptyState
            icon="goals"
            title="Nenhuma meta ainda"
            text="Viagem, reserva de emergência, fone novo: crie uma meta e veja o dinheiro crescer."
            action={
              <Button size="sm" onClick={() => openModal({ name: 'goal' })} testID="goals-empty-add">
                Criar meta
              </Button>
            }
            testID="goals-empty-state"
          />
        </Card>
      ) : (
        <div className={s.gridFill280}>
          {v.goals.map(({ goal, progress, deposit, depositLabel, accountName }) => {
            const due = deposit.kind === 'due' && !progress.done;
            return (
              <Card as="article" key={goal.id} className={g.goal} testID={`goal-${goal.id}`}>
                <div className={g.top}>
                  <Ring pct={progress.pct} color={goal.color} testID={`goal-${goal.id}-ring`} />
                  <div className={g.text}>
                    <h2 className={g.name}>{goal.name}</h2>
                    <span className={s.muted} style={{ fontSize: 13 }} data-testid={`goal-${goal.id}-saved`}>
                      {money(goal.saved)} de {formatBRL(goal.target)}
                    </span>
                    <span className={s.meta}>{progress.eta}</span>
                  </div>
                  <button type="button" className={g.edit} onClick={() => openModal({ name: 'goal', id: goal.id })} aria-label={`Editar ${goal.name}`} data-testid={`goal-${goal.id}-edit`}>
                    <Icon name="pencil" size={16} />
                  </button>
                </div>
                {deposit.kind !== 'none' || accountName ? (
                  <button type="button" className={`${g.depositLine} ${due ? g.due : ''}`} onClick={() => openModal({ name: 'deposit', goalId: goal.id })} disabled={progress.done} data-testid={`goal-${goal.id}-deposit-line`}>
                    <span data-testid={`goal-${goal.id}-deposit-status`}>
                      {accountName ? `${accountName} · ` : ''}
                      {depositLabel}
                    </span>
                    {!progress.done ? <Icon name="chevronRight" size={14} /> : null}
                  </button>
                ) : null}
                <div className={g.actions}>
                  {due ? (
                    <Button size="sm" onClick={() => openModal({ name: 'deposit', goalId: goal.id })} testID={`goal-${goal.id}-deposit`}>
                      Depositar
                    </Button>
                  ) : null}
                  <Button variant="soft" size="sm" disabled={progress.done} onClick={() => void actions.contributeToGoal(goal.id, goal.name, QUICK_CONTRIBUTION)} testID={`goal-${goal.id}-add`}>
                    + Guardar {formatBRL(QUICK_CONTRIBUTION).replace(',00', '')}
                  </Button>
                  {!due ? (
                    <Button variant="secondary" size="sm" disabled={progress.done} onClick={() => openModal({ name: 'deposit', goalId: goal.id })} testID={`goal-${goal.id}-deposit-other`}>
                      Outro valor
                    </Button>
                  ) : null}
                </div>
              </Card>
            );
          })}
          <DashedButton onClick={() => openModal({ name: 'goal' })} testID="goals-add" style={{ minHeight: 200, borderRadius: 24 }}>
            Nova meta
          </DashedButton>
        </div>
      )}
      {v.tip ? (
        <Card accent className={s.tip} testID="goals-tip">
          <h2 className={s.tipTitle}>Dica da semana</h2>
          <p className={s.tipText}>
            Você gastou {formatBRL(v.tip.amount)} com {v.tip.name} este mês. Guardar 10% disso já adianta sua meta em {formatBRL(v.tip.tip)}.
          </p>
        </Card>
      ) : null}
    </>
  );
}
