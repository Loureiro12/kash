'use client';

import { useUi } from '@/kash/ui';
import s from './Toast.module.css';

/** Toast (handoff): canto inferior direito, fundo --text, ponto verde, some em 2,2 s. */
export function Toast() {
  const toast = useUi((st) => st.toast);
  return (
    <div className={s.region} role="status" aria-live="polite" aria-atomic="true">
      {toast ? (
        <div key={toast.id} className={s.toast} data-testid="toast">
          <span className={s.dot} aria-hidden="true" />
          <span className={s.message} data-testid="toast-message">
            {toast.message}
          </span>
          {toast.action ? (
            <button type="button" className={s.action} onClick={toast.action.onPress} data-testid="toast-action">
              {toast.action.label}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
