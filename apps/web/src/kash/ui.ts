import { create } from 'zustand';

/** Modais do app. Cada um carrega o que precisa para abrir (id em edição, alvo…). */
export type ModalState =
  | { name: 'transaction'; txId?: string; kind?: 'expense' | 'income' }
  | { name: 'transfer'; transferId?: string; fromId?: string }
  | { name: 'card'; id?: string }
  | { name: 'account'; id?: string }
  | { name: 'bill'; id?: string }
  | { name: 'goal'; id?: string }
  | { name: 'deposit'; goalId: string }
  | { name: 'payInvoice'; invoiceId: string }
  | { name: 'category'; id?: string }
  | { name: 'changePassword' }
  | { name: 'deleteAccount' };

export type ModalName = ModalState['name'];

export interface ToastAction {
  label: string;
  onPress: () => void;
}

export interface Toast {
  id: number;
  message: string;
  action?: ToastAction;
}

export const TOAST_DURATION_MS = 2200;
/** com "Desfazer" o toast fica mais tempo na tela */
export const TOAST_ACTION_DURATION_MS = 5000;

interface UiState {
  modal: ModalState | null;
  /** muda a cada abertura: vira `key` do formulário para ele nascer limpo */
  modalNonce: number;
  toast: Toast | null;
  /** menu lateral aberto (telas estreitas) */
  navOpen: boolean;
  /** cartão selecionado na tela de Cartões */
  selectedCardId: string | null;
  /** fluxo de "esqueci a senha" em andamento: a sessão de recuperação não leva direto ao app */
  recovering: boolean;
  /** destino pré-escolhido ao abrir Importar (cartão ou conta de onde a pessoa veio) */
  importTarget: { type: 'card' | 'account'; id: string } | null;

  openModal: (modal: ModalState) => void;
  closeModal: () => void;
  showToast: (message: string, action?: ToastAction) => void;
  hideToast: () => void;
  setNavOpen: (open: boolean) => void;
  selectCard: (id: string | null) => void;
  setRecovering: (value: boolean) => void;
  setImportTarget: (target: { type: 'card' | 'account'; id: string } | null) => void;
  reset: () => void;
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;
let toastSeq = 0;

const initial = { modal: null, modalNonce: 0, toast: null, navOpen: false, selectedCardId: null, recovering: false, importTarget: null };

export const useUi = create<UiState>((set, get) => ({
  ...initial,
  openModal: (modal) => set((s) => ({ modal, modalNonce: s.modalNonce + 1, navOpen: false })),
  closeModal: () => set({ modal: null }),
  showToast: (message, action) => {
    if (toastTimer) clearTimeout(toastTimer);
    toastSeq += 1;
    set({ toast: { id: toastSeq, message, action } });
    toastTimer = setTimeout(() => get().hideToast(), action ? TOAST_ACTION_DURATION_MS : TOAST_DURATION_MS);
  },
  hideToast: () => {
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = null;
    set({ toast: null });
  },
  setNavOpen: (navOpen) => set({ navOpen }),
  selectCard: (selectedCardId) => set({ selectedCardId }),
  setRecovering: (recovering) => set({ recovering }),
  setImportTarget: (importTarget) => set({ importTarget }),
  reset: () => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ ...initial });
  },
}));

export const toast = (message: string, action?: ToastAction) => useUi.getState().showToast(message, action);
