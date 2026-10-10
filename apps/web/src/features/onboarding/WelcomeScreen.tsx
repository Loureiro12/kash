'use client';

import { formatBRL } from '@kash/domain';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Card, MoneyInput, ProgressBar, ToggleChip, uiStyles } from '@/components/app/ui';
import { useKashActions } from '@/kash/actions';
import { useKash } from '@/kash/data';
import { toast, useUi } from '@/kash/ui';
import { routes } from '@/features/app/nav';
import s from './onboarding.module.css';

const STEPS = 3;
/** sugestões rápidas de limite mensal */
export const BUDGET_PRESETS = [1000, 2000, 3000, 5000] as const;

/**
 * Boas-vindas do primeiro acesso: 3 passos curtos (contas, cartão, limite). Usa os mesmos modais
 * de cadastro do app; tudo é salvo na hora, então sair no meio não perde nada.
 */
export function WelcomeScreen() {
  const { user, accounts, cards, settings } = useKash();
  const actions = useKashActions();
  const router = useRouter();
  const openModal = useUi((st) => st.openModal);
  const [step, setStep] = useState(1);
  const [budget, setBudget] = useState(settings.monthlyBudget);
  const [finishing, setFinishing] = useState(false);
  const firstName = user.name.split(' ')[0] || 'oi';

  const finish = async (skip: boolean) => {
    setFinishing(true);
    const ok = await actions.updateSettings(skip ? { onboardingDone: true } : { onboardingDone: true, ...(budget > 0 ? { monthlyBudget: Math.round(budget * 100) / 100 } : {}) });
    if (!ok) {
      setFinishing(false);
      return;
    }
    if (!skip) toast(`Tudo pronto, ${firstName}! Agora lance seu primeiro gasto.`);
    router.replace(routes.home);
  };

  return (
    <div className={s.page}>
      <header className={s.top}>
        <span className={s.logo}>
          <span className={s.mark} aria-hidden="true">
            K
          </span>
          <span className={s.word}>Kash</span>
        </span>
        <button type="button" className={`${uiStyles.btn} ${uiStyles.link}`} onClick={() => void finish(true)} disabled={finishing} data-testid="welcome-skip">
          Pular
        </button>
      </header>

      <main id="conteudo" className={s.main} data-testid="welcome-screen">
        <div className={s.progress}>
          <span className={s.stepLabel} data-testid="welcome-step">
            Passo {step} de {STEPS}
          </span>
          <ProgressBar pct={(step / STEPS) * 100} height={6} label={`Passo ${step} de ${STEPS}`} />
        </div>

        {step === 1 ? (
          <section className={s.step} aria-labelledby="welcome-title">
            <p className={s.eyebrow}>Boas-vindas, {firstName}!</p>
            <h1 className={s.title} id="welcome-title">
              Onde fica seu dinheiro hoje?
            </h1>
            <p className={s.lead}>Cadastre sua conta corrente, poupança ou carteira com o saldo de hoje. O Kash parte daí: cada gasto e entrada atualiza o saldo.</p>
            {accounts.length > 0 ? (
              <Card className={s.list} testID="welcome-accounts">
                {accounts.map((a) => (
                  <div key={a.id} className={uiStyles.row}>
                    <span className={uiStyles.rowText}>
                      <span className={uiStyles.rowTitle}>{a.name}</span>
                      <span className={uiStyles.rowMeta}>{a.kind}</span>
                    </span>
                    <span className={uiStyles.rowValue}>{formatBRL(a.balance)}</span>
                  </div>
                ))}
              </Card>
            ) : null}
            <div className={s.actions}>
              <Button variant={accounts.length ? 'secondary' : 'primary'} onClick={() => openModal({ name: 'account' })} testID="welcome-add-account">
                {accounts.length ? '+ Outra conta' : '+ Adicionar conta'}
              </Button>
              {accounts.length ? (
                <Button onClick={() => setStep(2)} testID="welcome-next">
                  Continuar
                </Button>
              ) : null}
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section className={s.step} aria-labelledby="welcome-title">
            <h1 className={s.title} id="welcome-title">
              Você usa cartão de crédito?
            </h1>
            <p className={s.lead}>Com o cartão no Kash, você acompanha a fatura do mês, o limite disponível e as parcelas que ainda vão cair.</p>
            {cards.length > 0 ? (
              <Card className={s.list} testID="welcome-cards">
                {cards.map((c) => (
                  <div key={c.id} className={uiStyles.row}>
                    <span className={uiStyles.rowText}>
                      <span className={uiStyles.rowTitle}>{c.name}</span>
                      <span className={uiStyles.rowMeta}>•••• {c.last4}</span>
                    </span>
                    <span className={uiStyles.rowValue}>limite {formatBRL(c.limit)}</span>
                  </div>
                ))}
              </Card>
            ) : null}
            <div className={s.actions}>
              <Button variant={cards.length ? 'secondary' : 'primary'} onClick={() => openModal({ name: 'card' })} testID="welcome-add-card">
                {cards.length ? '+ Outro cartão' : '+ Adicionar cartão'}
              </Button>
              <Button variant={cards.length ? 'primary' : 'secondary'} onClick={() => setStep(3)} testID="welcome-next">
                {cards.length ? 'Continuar' : 'Não uso cartão'}
              </Button>
            </div>
            <button type="button" className={`${uiStyles.btn} ${uiStyles.link} ${s.back}`} onClick={() => setStep(1)} data-testid="welcome-back">
              ← Voltar
            </button>
          </section>
        ) : null}

        {step === 3 ? (
          <section className={s.step} aria-labelledby="welcome-title">
            <h1 className={s.title} id="welcome-title">
              Quanto você quer gastar por mês?
            </h1>
            <p className={s.lead}>É o seu limite mensal. O Kash mostra quanto sobra até o fim do mês e quanto já está comprometido nos próximos. Dá pra mudar depois em Perfil.</p>
            <MoneyInput label="Limite por mês" value={budget} onChangeValue={setBudget} className={s.budget} testID="welcome-budget" />
            <div className={uiStyles.chips} role="group" aria-label="Sugestões">
              {BUDGET_PRESETS.map((v) => (
                <ToggleChip key={v} label={formatBRL(v).replace(',00', '')} pressed={budget === v} onToggle={() => setBudget(v)} testID={`welcome-budget-${v}`} />
              ))}
            </div>
            <div className={s.actions}>
              <Button onClick={() => void finish(false)} disabled={!(budget > 0)} loading={finishing} testID="welcome-finish">
                Concluir
              </Button>
            </div>
            <button type="button" className={`${uiStyles.btn} ${uiStyles.link} ${s.back}`} onClick={() => setStep(2)} data-testid="welcome-back">
              ← Voltar
            </button>
          </section>
        ) : null}
      </main>
    </div>
  );
}
