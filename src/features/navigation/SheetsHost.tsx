import React from 'react';
import { Toast } from '@/design-system';
import { useKashStore } from '@/store';
import { AddAccountSheet } from '../accounts/AddAccountSheet';
import { AddCardSheet } from '../cards/AddCardSheet';
import { AddGoalSheet } from '../goals/AddGoalSheet';
import { DepositSheet } from '../goals/DepositSheet';
import { DeleteAccountSheet } from '../profile/DeleteAccountSheet';
import { ExpenseSheet } from '../transactions/ExpenseSheet';

/** Monta todos os sheets globais e o toast uma única vez, acima da navegação. */
export function SheetsHost() {
  return (
    <>
      <ExpenseSheet />
      <AddCardSheet />
      <AddAccountSheet />
      <AddGoalSheet />
      <DepositSheet />
      <DeleteAccountSheet />
    </>
  );
}

export function ToastHost() {
  const message = useKashStore((s) => s.ui.toast);
  return <Toast message={message} />;
}
