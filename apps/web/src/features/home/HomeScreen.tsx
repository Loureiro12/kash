'use client';

import { formatBRL, greetingFor } from '@kash/domain';
import Link from 'next/link';
import { useMemo } from 'react';
import { Badge, Button, Card, CardHeader, CardLink, EmptyState, ProgressBar, uiStyles } from '@/components/app/ui';
import { useKash } from '@/kash/data';
import { useUi } from '@/kash/ui';
import { homeView } from '@/kash/views';
import { useMoney, useNow } from '@/features/app/hooks';
import { routes } from '@/features/app/nav';
import { PageHeader } from '@/features/app/PageHeader';
import { TxRow } from '@/features/app/TxRow';
import s from '@/features/app/screens.module.css';

/** Início: saldo, gastos do mês, previsão, lançamentos, próximas contas e metas. */
export function HomeScreen() {
  const snap = useKash();
  const now = useNow();
  const money = useMoney();
  const openModal = useUi((st) => st.openModal);
  const v = useMemo(() => homeView(snap, now), [snap, now]);
  const firstName = snap.user.name.split(' ')[0] || 'você';

  return (
    <>
      <PageHeader title={`${greetingFor(now).replace(',', '')}, ${firstName}`} subtitle="Aqui está o resumo do seu mês." testID="home-title" />

      <div className={s.grid3}>
        <Card className={s.cardCol} testID="home-balance-card">
          <p className={s.label}>Saldo total</p>
          <p className={s.big} data-testid="home-balance">
            {money(v.totalBalance)}
          </p>
          <div className={s.chipsRow}>
            <Badge tone="pos" testID="home-income">
              ↑ {money(v.income)} entrou
            </Badge>
            <Badge tone="neg" testID="home-spent">
              ↓ {money(v.spent)} saiu
            </Badge>
          </div>
        </Card>

        <CardLink href={routes.report} accent className={s.cardColLg} testID="home-budget-card" label={`Gastos do mês: ${money(v.spent)} de ${formatBRL(v.budget)}. Ver relatório`}>
          <span className={s.accentHead}>
            <span>Gastos do mês</span>
            <span className={s.accentLink}>ver relatório →</span>
          </span>
          <span className={s.between}>
            <span className={s.accentValue} data-testid="home-month-spent">
              {money(v.spent)}
            </span>
            <span className={s.accentLink}>de {formatBRL(v.budget)}</span>
          </span>
          <ProgressBar pct={v.budgetStatus.pct} color="var(--ink)" track="var(--track-on-accent)" label="Uso do limite mensal" />
          <span style={{ fontSize: 12, fontWeight: 600 }} data-testid="home-budget-message">
            {v.budgetStatus.message}
          </span>
        </CardLink>

        <CardLink href={routes.forecast} className={s.cardColLg} testID="home-forecast-card" label="Previsão de gastos. Ver previsão">
          <span className={s.accentHead}>
            <span>Previsão de gastos</span>
            <span className={s.linkMore}>ver previsão →</span>
          </span>
          <span className={s.miniBars} aria-hidden="true">
            {v.forecastHeights.map((h, i) => (
              <span key={i} className={s.miniBar} style={{ height: `${h}%` }} />
            ))}
          </span>
          <span className={s.meta}>{v.nextMonth ? `${v.nextMonth.name}: ${formatBRL(v.nextMonth.total)} já comprometidos` : 'Nada comprometido nos próximos meses'}</span>
        </CardLink>
      </div>

      <div className={s.grid2}>
        <Card list testID="home-txs">
          <CardHeader
            title="Lançamentos"
            action={
              <span style={{ display: 'flex', gap: 14 }}>
                <Link href={routes.transactions} className={uiStyles.link} data-testid="home-txs-all">
                  ver todos
                </Link>
                <button type="button" className={`${uiStyles.btn} ${uiStyles.link}`} onClick={() => openModal({ name: 'transaction' })} data-testid="home-new-tx">
                  + novo
                </button>
              </span>
            }
          />
          {v.recent.length === 0 ? (
            <EmptyState
              icon="list"
              title="Nenhum lançamento ainda"
              text="Lance seu primeiro gasto ou entrada pra ver o mês tomando forma."
              action={
                <Button size="sm" onClick={() => openModal({ name: 'transaction' })} testID="home-empty-new-tx">
                  Lançar gasto
                </Button>
              }
              testID="home-txs-empty"
            />
          ) : (
            <div>
              {v.recent.map((t) => (
                <TxRow key={t.id} tx={t} />
              ))}
            </div>
          )}
        </Card>

        <div className={s.stack}>
          <Card list testID="home-bills">
            <CardHeader
              title="Próximas contas"
              action={
                <Link href={routes.bills} className={uiStyles.link} data-testid="home-bills-all">
                  ver todas
                </Link>
              }
            />
            {v.invoices.length === 0 && v.bills.length === 0 ? (
              <p className={s.emptyLine} data-testid="home-bills-empty">
                Tudo pago por aqui. 🎉
              </p>
            ) : (
              <div>
                {v.invoices.map((inv) => (
                  <Link key={inv.id} href={routes.cards} className={`${uiStyles.row} ${uiStyles.rowButton}`} style={{ color: 'inherit', textDecoration: 'none' }} data-testid={`home-invoice-${inv.id}`}>
                    <span className={`${s.dayBadge} ${s.dayBadgeAccent}`} aria-hidden="true">
                      <span>VENCE</span>
                      <span>{inv.dueLabel.slice(0, 2)}</span>
                    </span>
                    <span className={uiStyles.rowText}>
                      <span className={uiStyles.rowTitle}>Fatura {inv.cardName}</span>
                      <span className={uiStyles.rowMeta}>
                        {inv.monthName} · vence {inv.dueLabel}
                      </span>
                    </span>
                    <span className={uiStyles.rowValue}>{formatBRL(inv.total)}</span>
                  </Link>
                ))}
                {v.bills.slice(0, 5).map((b) => (
                  <div key={b.id} className={uiStyles.row} data-testid={`home-bill-${b.id}`}>
                    <span className={s.dayBadge} aria-label={`Dia ${b.dueDay}`}>
                      <span>DIA</span>
                      <span>{b.dueDay}</span>
                    </span>
                    <span className={uiStyles.rowText}>
                      <span className={uiStyles.rowTitle}>{b.name}</span>
                    </span>
                    <span className={uiStyles.rowValue}>{formatBRL(b.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card testID="home-goals" className={s.stack}>
            <CardHeader
              title="Metas"
              action={
                <Link href={routes.goals} className={uiStyles.link} data-testid="home-goals-all">
                  ver metas
                </Link>
              }
            />
            {v.goals.length === 0 ? (
              <p className={s.emptyLine}>Nenhuma meta ainda.</p>
            ) : (
              v.goals.map(({ goal, progress }) => (
                <div key={goal.id} className={s.catRow}>
                  <div className={s.catHead}>
                    <span className={s.catName}>{goal.name}</span>
                    <span className={s.catValue}>{progress.pct}%</span>
                  </div>
                  <ProgressBar pct={progress.pct} color={goal.color} label={`Progresso de ${goal.name}`} />
                </div>
              ))
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
