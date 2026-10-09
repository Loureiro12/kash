'use client';

import { useUi, type ModalState } from '@/kash/ui';
import { AccountModal } from './AccountModal';
import { BillModal } from './BillModal';
import { CardModal } from './CardModal';
import { CategoryModal } from './CategoryModal';
import { GoalModal } from './GoalModal';
import { ChangePasswordModal, DeleteAccountModal, DepositModal, PayInvoiceModal } from './SmallModals';
import { TransactionModal } from './TransactionModal';

function renderModal(modal: ModalState, onClose: () => void) {
  switch (modal.name) {
    case 'transaction':
      return <TransactionModal txId={modal.txId} initialKind={modal.kind} onClose={onClose} />;
    case 'card':
      return <CardModal id={modal.id} onClose={onClose} />;
    case 'account':
      return <AccountModal id={modal.id} onClose={onClose} />;
    case 'bill':
      return <BillModal id={modal.id} onClose={onClose} />;
    case 'goal':
      return <GoalModal id={modal.id} onClose={onClose} />;
    case 'deposit':
      return <DepositModal goalId={modal.goalId} onClose={onClose} />;
    case 'payInvoice':
      return <PayInvoiceModal invoiceId={modal.invoiceId} onClose={onClose} />;
    case 'category':
      return <CategoryModal id={modal.id} onClose={onClose} />;
    case 'changePassword':
      return <ChangePasswordModal onClose={onClose} />;
    case 'deleteAccount':
      return <DeleteAccountModal onClose={onClose} />;
  }
}

/** Renderiza o modal aberto. Cada abertura remonta o formulário (key = nonce), então ele nasce limpo. */
export function ModalsHost() {
  const modal = useUi((s) => s.modal);
  const nonce = useUi((s) => s.modalNonce);
  const closeModal = useUi((s) => s.closeModal);
  if (!modal) return null;
  return <div key={nonce}>{renderModal(modal, closeModal)}</div>;
}
