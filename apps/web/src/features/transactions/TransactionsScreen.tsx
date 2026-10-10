'use client';

import { categoryColorMap, DEFAULT_TX_FILTERS, formatBRL, type TxFilters, type TxKindFilter } from '@kash/domain';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Icon } from '@/components/app/Icon';
import { Button, Card, EmptyState, IconButton, Segmented, TextInput, ToggleChip, uiStyles } from '@/components/app/ui';
import { useKash } from '@/kash/data';
import { useUi } from '@/kash/ui';
import { transactionsView } from '@/kash/views';
import { useNow } from '@/features/app/hooks';
import { routes } from '@/features/app/nav';
import { PageHeader } from '@/features/app/PageHeader';
import { TxRow } from '@/features/app/TxRow';
import s from '@/features/app/screens.module.css';
import t from './transactions.module.css';

/** o snapshot traz 12 meses de lançamentos */
export const MIN_MONTH_OFFSET = -11;

/** Lançamentos: lista completa por mês, com busca e filtros de tipo e categoria. */
export function TransactionsScreen() {
  const snap = useKash();
  const now = useNow();
  const openModal = useUi((st) => st.openModal);
  const [filters, setFilters] = useState<TxFilters>(DEFAULT_TX_FILTERS);
  const [search, setSearch] = useState('');
  const v = useMemo(() => transactionsView(snap, filters, now, search), [snap, filters, now, search]);
  const colors = useMemo(() => categoryColorMap(snap.categories), [snap.categories]);
  const set = (patch: Partial<TxFilters>) => setFilters((f) => ({ ...f, ...patch }));

  return (
    <>
      <PageHeader
        title="Lançamentos"
        subtitle="Tudo o que entrou e saiu, mês a mês. Clique num lançamento pra editar ou excluir."
        actions={
          <div className={t.newBtns}>
            <Button variant="soft" size="sm" onClick={() => openModal({ name: 'transaction', kind: 'income' })} testID="tx-new-income">
              + Entrada
            </Button>
            <Link href={routes.importer} className={`${uiStyles.btn} ${uiStyles.secondary} ${uiStyles.sm}`} onClick={() => useUi.getState().setImportTarget(null)} data-testid="tx-import">
              Importar
            </Link>
            <Button variant="secondary" size="sm" onClick={() => openModal({ name: 'transfer' })} testID="tx-new-transfer">
              ⇄ Transferir
            </Button>
          </div>
        }
      />

      <Card className={t.filters}>
        <div className={t.month}>
          <IconButton icon="chevronLeft" label="Mês anterior" disabled={filters.monthOffset <= MIN_MONTH_OFFSET} onClick={() => set({ monthOffset: filters.monthOffset - 1 })} testID="tx-month-prev" />
          <h2 className={t.monthTitle} data-testid="tx-month-title" aria-live="polite">
            {v.title}
          </h2>
          <IconButton icon="chevronRight" label="Próximo mês" disabled={filters.monthOffset >= 0} onClick={() => set({ monthOffset: filters.monthOffset + 1 })} testID="tx-month-next" />
        </div>
        <div className={t.searchRow}>
          <div className={t.search}>
            <Icon name="search" size={16} className={t.searchIcon} />
            <TextInput type="search" placeholder="Buscar por descrição ou categoria" aria-label="Buscar lançamentos" value={search} onChange={(e) => setSearch(e.target.value)} testID="tx-search" className={t.searchInput} />
          </div>
          <Segmented<TxKindFilter>
            label="Tipo"
            value={filters.kind}
            onChange={(kind) => set({ kind, category: kind === 'income' || kind === 'transfer' ? null : filters.category })}
            options={[
              { value: 'all', label: 'Tudo', testID: 'tx-kind-all' },
              { value: 'expense', label: 'Gastos', testID: 'tx-filter-expense' },
              { value: 'income', label: 'Entradas', testID: 'tx-filter-income' },
              { value: 'transfer', label: 'Transferências', testID: 'tx-filter-transfer' },
            ]}
          />
        </div>
        {filters.kind === 'all' || filters.kind === 'expense' ? (
          <div className={uiStyles.chips} role="group" aria-label="Categoria" data-testid="tx-categories">
            <ToggleChip label="Todas" pressed={filters.category === null} onToggle={() => set({ category: null })} testID="tx-cat-all" />
            {snap.categories.map((c) => (
              <ToggleChip key={c.id} label={c.name} dotColor={colors[c.name]} pressed={filters.category === c.name} onToggle={() => set({ category: filters.category === c.name ? null : c.name })} testID={`tx-cat-${c.name}`} />
            ))}
          </div>
        ) : null}
      </Card>

      <div className={s.between}>
        <span className={s.meta} data-testid="tx-count">
          {v.totals.count} {v.totals.count === 1 ? 'lançamento' : 'lançamentos'}
        </span>
        <span style={{ display: 'flex', gap: 12, fontSize: 13, fontWeight: 600 }}>
          {v.totals.income > 0 ? (
            <span className={s.pos} data-testid="tx-total-income">
              + {formatBRL(v.totals.income)}
            </span>
          ) : null}
          {v.totals.spent > 0 ? (
            <span className={s.neg} data-testid="tx-total-spent">
              − {formatBRL(v.totals.spent)}
            </span>
          ) : null}
        </span>
      </div>

      {v.groups.length === 0 ? (
        <Card>
          <EmptyState icon="search" title="Nada por aqui" text={search ? 'Nenhum lançamento com essa busca neste mês.' : 'Nenhum lançamento com esses filtros neste mês.'} testID="tx-empty" />
        </Card>
      ) : (
        <Card list testID="tx-list">
          {v.groups.map((g) => (
            <section key={g.date} aria-label={g.label} data-testid={`tx-day-${g.date}`}>
              <h3 className={t.day}>{g.label}</h3>
              {g.items.map((item) => (
                <TxRow key={item.id} tx={item} />
              ))}
            </section>
          ))}
        </Card>
      )}
    </>
  );
}
