'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Card, ProgressBar, uiStyles } from '@/components/app/ui';
import { useKash } from '@/kash/data';
import { reportView } from '@/kash/views';
import { useMoney, useNow } from '@/features/app/hooks';
import { routes } from '@/features/app/nav';
import { PageHeader } from '@/features/app/PageHeader';
import s from '@/features/app/screens.module.css';
import r from './category.module.css';

/** Relatório: gasto do mês, variação, 6 meses e por categoria. */
export function ReportScreen() {
  const snap = useKash();
  const now = useNow();
  const money = useMoney();
  const v = useMemo(() => reportView(snap, now), [snap, now]);

  return (
    <>
      <PageHeader title="Relatório" subtitle={`Gastos de ${v.monthName} por mês e por categoria.`} />
      <div className={s.grid2}>
        <Card testID="report-month">
          <p className={s.label}>Gastos · {v.monthName}</p>
          <p className={s.big} style={{ marginTop: 2 }} data-testid="report-total">
            {money(v.spent)}
          </p>
          <p className={`${s.pos}`} style={{ fontSize: 13, fontWeight: 600, margin: '2px 0 0' }} data-testid="report-delta">
            {v.delta.message}
          </p>
          <div className={s.chart} role="img" aria-label={`Gastos dos últimos 6 meses: ${v.history.map((m) => `${m.label} ${money(m.value)}`).join(', ')}`} data-testid="report-chart">
            {v.history.map((m) => (
              <div key={m.label} className={s.barCol}>
                <div className={s.bar} style={{ height: `${m.height}%`, background: m.current ? 'var(--accent)' : 'var(--surface2)' }} />
                <span className={`${s.barLabel} ${m.current ? s.barLabelOn : ''}`}>{m.label}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className={s.stack} testID="report-categories">
          <h2 className={uiStyles.cardTitle}>Por categoria</h2>
          <p className={s.meta} style={{ margin: '-6px 0 0' }}>
            Clique numa categoria pra ver os gastos dela mês a mês.
          </p>
          {v.categories.length === 0 ? (
            <p className={s.emptyLine}>Nenhum gasto neste mês ainda.</p>
          ) : (
            v.categories.map((c) => (
              <Link key={c.name} href={routes.category(c.name)} className={`${s.catRow} ${r.catLink}`} aria-label={`${c.name}: ${money(c.amount)}, ${c.pct}% dos gastos. Ver detalhes`} data-testid={`report-cat-${c.name}`}>
                <div className={s.catHead}>
                  <span className={s.catName}>
                    <span className={s.legendSwatch} style={{ background: c.color }} aria-hidden="true" />
                    {c.name}
                  </span>
                  <span className={s.catValue}>
                    {money(c.amount)} · {c.pct}% <span aria-hidden="true">›</span>
                  </span>
                </div>
                <ProgressBar pct={c.pct} color={c.color} label={`${c.name}: ${c.pct}% dos gastos`} />
              </Link>
            ))
          )}
        </Card>
      </div>
    </>
  );
}
