'use client';

import { forecastSelection, formatBRL } from '@kash/domain';
import { useMemo, useState } from 'react';
import { Card, uiStyles } from '@/components/app/ui';
import { useKash } from '@/kash/data';
import { forecastView } from '@/kash/views';
import { useNow } from '@/features/app/hooks';
import { PageHeader } from '@/features/app/PageHeader';
import s from '@/features/app/screens.module.css';

/** Previsão: clicar num mês recalcula total, divisão, % do limite e acumulado, e troca a lista. */
export function ForecastScreen() {
  const snap = useKash();
  const now = useNow();
  const v = useMemo(() => forecastView(snap, now), [snap, now]);
  const [selected, setSelected] = useState(1);
  const summary = forecastSelection(v.months, selected, v.budget);
  const first = v.months[0];

  return (
    <>
      <PageHeader title="Previsão" subtitle="Quanto já está comprometido nos próximos meses com contas fixas e parcelas do cartão." />
      {summary && first ? (
        <div className={s.grid2}>
          <Card testID="forecast-summary">
            <p className={s.label} data-testid="forecast-month-heading">
              Comprometido em {summary.month.name}
            </p>
            <p className={s.big} style={{ marginTop: 2 }} data-testid="forecast-month-total" aria-live="polite">
              {formatBRL(summary.month.total)}
            </p>
            {v.budget > 0 ? (
              <p className={summary.leftover >= 0 ? s.muted : s.neg} style={{ fontSize: 13, margin: '2px 0 0' }} data-testid="forecast-month-budget">
                {summary.pctOfBudget}% do seu limite mensal de {formatBRL(v.budget)} · {summary.leftover >= 0 ? `sobram ${formatBRL(summary.leftover)}` : `passa ${formatBRL(-summary.leftover)}`}
              </p>
            ) : null}
            <div className={s.chart} role="radiogroup" aria-label="Meses da previsão" data-testid="forecast-chart">
              {v.months.map((m, i) => {
                const active = selected === m.offset;
                return (
                  <button key={m.offset} type="button" role="radio" aria-checked={active} className={s.barCol} onClick={() => setSelected(m.offset)} aria-label={`${m.name}: ${formatBRL(m.total)}`} data-testid={`forecast-month-${m.offset}`}>
                    {active ? <span className={s.barValue}>{formatBRL(m.total).replace('R$ ', '')}</span> : null}
                    <span className={s.stacked} style={{ height: `${(v.heights[i] ?? 8) * 0.85}%`, opacity: active ? 1 : 0.45 }}>
                      <span style={{ flex: m.installments, background: 'var(--accent)' }} />
                      <span style={{ flex: m.bills, background: 'var(--muted)' }} />
                    </span>
                    <span className={`${s.barLabel} ${active ? s.barLabelOn : ''}`}>{m.label}</span>
                  </button>
                );
              })}
            </div>
            <div className={s.legend}>
              <span className={s.legendItem} data-testid="forecast-month-bills">
                <span className={s.legendSwatch} style={{ background: 'var(--muted)' }} aria-hidden="true" />
                Contas fixas {formatBRL(summary.month.bills)}
              </span>
              <span className={s.legendItem} data-testid="forecast-month-installments">
                <span className={s.legendSwatch} style={{ background: 'var(--accent)' }} aria-hidden="true" />
                Parcelas {formatBRL(summary.month.installments)}
              </span>
              <span>Clique num mês pra ver o detalhe</span>
            </div>
            <div className={`${s.between} ${s.divider}`}>
              <span className={s.meta} data-testid="forecast-cumulative-label">
                {summary.monthsCounted > 1 ? `Acumulado de ${first.name} a ${summary.month.name}` : `Acumulado em ${first.name}`}
              </span>
              <b data-testid="forecast-cumulative">{formatBRL(summary.cumulative)}</b>
            </div>
          </Card>

          <Card list testID="forecast-items">
            <div className={uiStyles.cardHead}>
              <h2 className={uiStyles.cardTitle} data-testid="forecast-selected-title">
                Em {summary.month.name}
              </h2>
              <b style={{ fontSize: 16 }}>{formatBRL(summary.month.total)}</b>
            </div>
            <p className={s.meta} style={{ margin: '0 0 4px' }} data-testid="forecast-selected-count">
              {summary.month.items.length} {summary.month.items.length === 1 ? 'compromisso' : 'compromissos'}
            </p>
            {summary.month.items.length === 0 ? (
              <p className={s.emptyLine}>Nada comprometido neste mês.</p>
            ) : (
              summary.month.items.map((item) => (
                <div key={item.id} className={uiStyles.row}>
                  <span className={`${s.tag} ${item.kind === 'installment' ? s.tagInst : s.tagBill}`}>{item.tag}</span>
                  <span className={uiStyles.rowText}>
                    <span className={uiStyles.rowTitle}>{item.title}</span>
                    <span className={uiStyles.rowMeta}>{item.subtitle}</span>
                  </span>
                  <span className={uiStyles.rowValue}>{formatBRL(item.amount)}</span>
                </div>
              ))
            )}
          </Card>
        </div>
      ) : null}
    </>
  );
}
