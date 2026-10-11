'use client';

import { formatBRL } from '@kash/domain';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Card, Chip, ProgressBar, uiStyles } from '@/components/app/ui';
import { useKash } from '@/kash/data';
import { categoryView } from '@/kash/views';
import { useMoney, useNow } from '@/features/app/hooks';
import { routes } from '@/features/app/nav';
import { PageHeader } from '@/features/app/PageHeader';
import { TxRow } from '@/features/app/TxRow';
import s from '@/features/app/screens.module.css';
import c from './category.module.css';

/**
 * Gastos de uma categoria, no estilo da Previsão: barras dos últimos 6 meses (clique escolhe o mês),
 * total e comparação, onde mais gastou e os lançamentos do mês. Os chips trocam de categoria.
 */
export function CategoryScreen({ category }: { category: string }) {
  const snap = useKash();
  const now = useNow();
  const money = useMoney();
  const router = useRouter();
  const [offset, setOffset] = useState(0);
  const v = useMemo(() => categoryView(snap, category, offset, now), [snap, category, offset, now]);

  return (
    <>
      <PageHeader title={category} subtitle="Quanto você gastou nesta categoria, mês a mês, e onde." back={{ href: routes.report, label: 'Relatório' }} />
      <div className={c.chips} role="radiogroup" aria-label="Categorias" data-testid="category-chips">
        {snap.categories.map((cat) => (
          <Chip key={cat.id} label={cat.name} dotColor={cat.color} selected={cat.name === category} onSelect={() => router.replace(routes.category(cat.name))} testID={`category-chip-${cat.name}`} />
        ))}
      </div>

      <div className={s.grid2}>
        <div className={s.stack}>
          <Card testID="category-summary">
            <p className={s.label} data-testid="category-month-heading">
              {category} em {v.selected.name}
            </p>
            <p className={s.big} style={{ marginTop: 2 }} data-testid="category-total" aria-live="polite">
              {money(v.selected.total)}
            </p>
            <p className={v.delta.pct > 0 ? s.neg : s.pos} style={{ fontSize: 13, fontWeight: 600, margin: '2px 0 0' }} data-testid="category-delta">
              {v.delta.message}
            </p>
            {v.count > 0 ? (
              <p className={s.meta} style={{ margin: '6px 0 0' }} data-testid="category-stats">
                {v.sharePct}% dos seus gastos do mês · {v.count} {v.count === 1 ? 'lançamento' : 'lançamentos'} · média de {money(v.average)}
              </p>
            ) : null}
            <div className={s.chart} role="radiogroup" aria-label={`Gastos em ${category} nos últimos meses`} data-testid="category-chart">
              {v.months.map((m) => {
                const active = m.offset === v.selected.offset;
                return (
                  <button key={m.offset} type="button" role="radio" aria-checked={active} className={s.barCol} onClick={() => setOffset(m.offset)} aria-label={`${m.name}: ${formatBRL(m.total)}`} data-testid={`category-month-${m.offset}`}>
                    {active ? <span className={s.barValue}>{formatBRL(m.total).replace('R$ ', '')}</span> : null}
                    <span className={s.bar} style={{ height: `${m.height * 0.85}%`, background: v.color, opacity: active ? 1 : 0.4 }} />
                    <span className={`${s.barLabel} ${active ? s.barLabelOn : ''}`}>{m.label}</span>
                  </button>
                );
              })}
            </div>
            <p className={s.meta} style={{ margin: '10px 0 0' }}>
              Clique num mês pra ver o detalhe
            </p>
          </Card>

          {v.places.length > 0 ? (
            <Card className={s.stack} testID="category-places">
              <h2 className={uiStyles.cardTitle}>Onde você mais gastou</h2>
              {v.places.map((p, i) => (
                <div key={p.title} className={s.catRow} data-testid={`category-place-${i}`}>
                  <div className={s.catHead}>
                    <span className={s.catName}>
                      {p.title}
                      {p.count > 1 ? <span className={s.meta}>{p.count}×</span> : null}
                    </span>
                    <span className={s.catValue}>
                      {money(p.amount)} · {p.pct}%
                    </span>
                  </div>
                  <ProgressBar pct={p.pct} color={v.color} label={`${p.title}: ${p.pct}% de ${category}`} />
                </div>
              ))}
            </Card>
          ) : null}
        </div>

        <Card list testID="category-txs">
          <div className={uiStyles.cardHead}>
            <h2 className={uiStyles.cardTitle} data-testid="category-list-title">
              Lançamentos de {v.selected.name}
            </h2>
            <span className={s.meta}>
              {v.count} {v.count === 1 ? 'lançamento' : 'lançamentos'}
            </span>
          </div>
          {v.groups.length === 0 ? (
            <p className={s.emptyLine} data-testid="category-empty">
              Nenhum gasto em {category} em {v.selected.name}.
            </p>
          ) : (
            v.groups.map((g) => (
              <div key={g.date} data-testid={`category-day-${g.date}`}>
                <p className={c.day}>{g.label}</p>
                {g.items.map((t) => (
                  <TxRow key={t.id} tx={t} testID={`category-tx-${t.id}`} />
                ))}
              </div>
            ))
          )}
        </Card>
      </div>
    </>
  );
}
