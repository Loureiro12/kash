import React from 'react';
import { Toast } from '@/design-system';
import { useKashStore } from '@/store';
import { AddAccountSheet } from '../accounts/AddAccountSheet';
import { AddBillSheet } from '../accounts/AddBillSheet';
import { AddCardSheet } from '../cards/AddCardSheet';
import { AddGoalSheet } from '../goals/AddGoalSheet';
import { DepositSheet } from '../goals/DepositSheet';
import { ChangePasswordSheet } from '../profile/ChangePasswordSheet';
import { DeleteAccountSheet } from '../profile/DeleteAccountSheet';
import { TransactionSheet } from '../transactions/TransactionSheet';

/** Monta todos os sheets globais e o toast uma única vez, acima da navegação. */
export function SheetsHost() {
  return (
    <>
      <TransactionSheet />
      <AddCardSheet />
      <AddAccountSheet />
      <AddBillSheet />
      <AddGoalSheet />
      <DepositSheet />
      <ChangePasswordSheet />
      <DeleteAccountSheet />
    </>
  );
}

export function ToastHost() {
  const message = useKashStore((s) => s.ui.toast);
  const action = useKashStore((s) => s.ui.toastAction);
  return <Toast message={message} actionLabel={action?.label} onAction={action?.onPress} />;
}
