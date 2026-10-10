'use client';

import { onboardingStatus, type OnboardingStepId } from '@kash/domain';
import { useMemo } from 'react';
import { Icon } from '@/components/app/Icon';
import { Button, Card, ProgressBar } from '@/components/app/ui';
import { useKashActions } from '@/kash/actions';
import { useKash } from '@/kash/data';
import { useUi, type ModalState } from '@/kash/ui';
import s from './onboarding.module.css';

/** o que cada passo abre */
const ACTION: Record<OnboardingStepId, { label: string; modal: ModalState }> = {
  account: { label: 'Adicionar conta', modal: { name: 'account' } },
  expense: { label: 'Lançar gasto', modal: { name: 'transaction' } },
  card: { label: 'Adicionar cartão', modal: { name: 'card' } },
  bill: { label: 'Nova conta fixa', modal: { name: 'bill' } },
  goal: { label: 'Criar meta', modal: { name: 'goal' } },
};

/** Card "Primeiros passos" no Início: marca sozinho conforme a pessoa usa o Kash. */
export function ChecklistCard() {
  const snap = useKash();
  const actions = useKashActions();
  const openModal = useUi((st) => st.openModal);
  const status = useMemo(() => onboardingStatus(snap), [snap]);
  if (!status.showChecklist) return null;
  const hide = () => void actions.updateSettings({ checklistHidden: true });

  if (status.allDone) {
    return (
      <Card accent className={s.checklist} testID="checklist-done">
        <div className={s.checklistHead}>
          <div>
            <h2 className={s.checklistTitle}>Tudo pronto! 🎉</h2>
            <p className={s.count} style={{ color: 'inherit', opacity: 0.8 }}>
              Contas, gastos, contas fixas e metas no lugar. Agora é só usar o Kash no dia a dia.
            </p>
          </div>
          <Button variant="inverse" size="sm" onClick={hide} testID="checklist-close">
            Fechar
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className={s.checklist} testID="checklist" aria-labelledby="checklist-title">
      <div className={s.checklistHead}>
        <div>
          <h2 className={s.checklistTitle} id="checklist-title">
            Primeiros passos
          </h2>
          <p className={s.count} data-testid="checklist-count">
            {status.doneCount} de {status.total} feitos
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={hide} testID="checklist-hide">
          Esconder
        </Button>
      </div>
      <ProgressBar pct={status.pct} label="Progresso dos primeiros passos" />
      <ol className={s.steps}>
        {status.steps.map((step) => (
          <li key={step.id} className={`${s.item} ${step.done ? s.itemDone : ''}`} data-testid={`checklist-${step.id}`} data-done={step.done}>
            <span className={s.check} aria-hidden="true">
              {step.done ? <Icon name="check" size={13} strokeWidth={3.5} /> : null}
            </span>
            <span className={s.itemText}>
              <span className={s.itemTitle}>
                {step.title}
                {step.optional ? <span className={s.optional}>opcional</span> : null}
                <span className="sr-only">{step.done ? ' (feito)' : ' (a fazer)'}</span>
              </span>
              <span className={s.itemDesc}>{step.description}</span>
              {!step.done ? (
                <Button variant={status.next?.id === step.id ? 'primary' : 'surface'} size="sm" className={s.itemAction} onClick={() => openModal(ACTION[step.id].modal)} testID={`checklist-${step.id}-action`}>
                  {ACTION[step.id].label}
                </Button>
              ) : null}
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}
