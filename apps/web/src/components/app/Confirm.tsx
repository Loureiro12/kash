'use client';

import { create } from 'zustand';
import { Button, type ButtonVariant } from './ui';
import { Modal, modalStyles } from './Modal';

export interface ConfirmChoice {
  label: string;
  value: string;
  variant?: ButtonVariant;
  testID?: string;
}

interface ConfirmRequest {
  title: string;
  message: string;
  choices: ConfirmChoice[];
  resolve: (value: string | null) => void;
}

const useConfirmStore = create<{ request: ConfirmRequest | null }>(() => ({ request: null }));

/**
 * Pergunta antes de algo destrutivo (equivalente ao Alert do app). Resolve com o `value`
 * da escolha ou null se cancelar/fechar.
 */
export function confirmDialog(input: { title: string; message: string; choices: ConfirmChoice[] }): Promise<string | null> {
  return new Promise((resolve) => {
    useConfirmStore.getState().request?.resolve(null);
    useConfirmStore.setState({ request: { ...input, resolve } });
  });
}

/** Atalho para "Excluir X?" com uma única ação destrutiva. */
export async function confirmDelete(title: string, message: string, label = 'Excluir'): Promise<boolean> {
  return (await confirmDialog({ title, message, choices: [{ label, value: 'yes', variant: 'danger', testID: 'confirm-yes' }] })) === 'yes';
}

export function ConfirmHost() {
  const request = useConfirmStore((s) => s.request);
  if (!request) return null;
  const finish = (value: string | null) => {
    useConfirmStore.setState({ request: null });
    request.resolve(value);
  };
  return (
    <Modal title={request.title} onClose={() => finish(null)} size="sm" testID="confirm">
      <p className={modalStyles.note}>{request.message}</p>
      <div className={modalStyles.footer}>
        {request.choices.map((c) => (
          <Button key={c.value} variant={c.variant ?? 'surface'} size="md" full onClick={() => finish(c.value)} testID={c.testID}>
            {c.label}
          </Button>
        ))}
        <Button variant="secondary" size="md" full onClick={() => finish(null)} testID="confirm-cancel">
          Cancelar
        </Button>
      </div>
    </Modal>
  );
}
