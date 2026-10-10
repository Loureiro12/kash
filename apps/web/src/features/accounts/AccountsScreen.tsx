'use client';

import { totalBalance } from '@kash/domain';
import Link from 'next/link';
import { Button, Card, DashedButton, EmptyState, uiStyles } from '@/components/app/ui';
import { readableInk } from '@/components/app/colors';
import { useKash } from '@/kash/data';
import { useUi } from '@/kash/ui';
import { useMoney } from '@/features/app/hooks';
import { routes } from '@/features/app/nav';
import { PageHeader } from '@/features/app/PageHeader';
import s from '@/features/app/screens.module.css';
import a from './accounts.module.css';

/** Contas bancárias: total + grade de contas (clique edita) + adicionar. */
export function AccountsScreen() {
  const { accounts } = useKash();
  const money = useMoney();
  const openModal = useUi((st) => st.openModal);

  return (
    <>
      <PageHeader
        title="Contas bancárias"
        subtitle="O saldo de todas as suas contas num lugar só."
        actions={
          <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link href={routes.importer} className={`${uiStyles.btn} ${uiStyles.secondary} ${uiStyles.sm}`} onClick={() => useUi.getState().setImportTarget({ type: 'account', id: accounts[0]?.id ?? '' })} data-testid="accounts-import">
              Importar extrato
            </Link>
            {accounts.length >= 2 ? (
              <Button variant="soft" size="sm" onClick={() => openModal({ name: 'transfer' })} testID="accounts-transfer">
                ⇄ Transferir
              </Button>
            ) : null}
          </span>
        }
      />
      {accounts.length === 0 ? (
        <Card>
          <EmptyState
            icon="wallet"
            title="Nenhuma conta ainda"
            text="Adicione sua conta corrente, poupança ou carteira pra ver o saldo total."
            action={
              <Button size="sm" onClick={() => openModal({ name: 'account' })} testID="accounts-empty-add">
                Adicionar conta
              </Button>
            }
            testID="accounts-empty-state"
          />
        </Card>
      ) : (
        <>
          <Card className={s.cardCol}>
            <p className={s.label}>Em todas as contas</p>
            <p className={s.big} data-testid="accounts-total">
              {money(totalBalance(accounts))}
            </p>
          </Card>
          <div className={s.gridFill240}>
            {accounts.map((acc) => (
              <button key={acc.id} type="button" className={`${uiStyles.card} ${uiStyles.clickable} ${a.account}`} onClick={() => openModal({ name: 'account', id: acc.id })} data-testid={`account-${acc.id}`} aria-label={`${acc.name}, ${acc.kind}, ${money(acc.balance)}. Editar`}>
                <span className={a.tile} style={{ background: acc.color, color: readableInk(acc.color) }} aria-hidden="true">
                  {(acc.name[0] ?? '?').toUpperCase()}
                </span>
                <span className={a.text}>
                  <span className={a.name}>{acc.name}</span>
                  <span className={s.meta}>{acc.kind}</span>
                </span>
                <span className={`${s.val} ${acc.balance < 0 ? s.neg : ''}`}>{money(acc.balance)}</span>
              </button>
            ))}
            <DashedButton onClick={() => openModal({ name: 'account' })} testID="accounts-add" style={{ minHeight: 180 }}>
              Adicionar conta
            </DashedButton>
          </div>
        </>
      )}
    </>
  );
}
