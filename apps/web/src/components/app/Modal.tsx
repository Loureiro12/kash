'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import s from './Modal.module.css';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** modais abertos (o de cima recebe Esc e Tab) */
const stack: HTMLElement[] = [];

/**
 * Modal centralizado (handoff: máx. 520px, overlay .55, fade + translateY 300ms).
 * Acessível: role=dialog + aria-modal, foco preso dentro, Esc e clique fora fecham, e o foco
 * volta para quem abriu. Em telas estreitas vira uma folha que sobe de baixo.
 */
export function Modal({ title, onClose, children, footer, size = 'md', testID, headerExtra, icon }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; size?: 'md' | 'sm'; testID?: string; headerExtra?: ReactNode; icon?: ReactNode }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const opener = document.activeElement as HTMLElement | null;
    stack.push(panel);
    // foco inicial: primeiro campo do formulário, senão o painel
    const first = panel.querySelector<HTMLElement>('[data-autofocus], input:not([type="color"]):not([disabled]), textarea') ?? panel;
    first.focus({ preventScroll: true });
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== panel) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const firstEl = items[0]!;
      const lastEl = items[items.length - 1]!;
      if (e.shiftKey && (document.activeElement === firstEl || document.activeElement === panel)) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      stack.splice(stack.indexOf(panel), 1);
      if (stack.length === 0) document.body.style.overflow = prevOverflow;
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, []);

  return createPortal(
    <div className={s.root} data-testid={testID}>
      <div className={s.overlay} onClick={onClose} aria-hidden="true" data-testid={testID ? `${testID}-overlay` : undefined} />
      <div ref={panelRef} className={`${s.panel} ${size === 'sm' ? s.sm : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        {icon}
        <div className={s.head}>
          <h2 className={s.title} id={titleId}>
            {title}
          </h2>
          <button type="button" className={s.close} onClick={onClose} aria-label="Fechar" data-testid={testID ? `${testID}-close` : undefined}>
            <Icon name="close" size={16} strokeWidth={2.4} />
          </button>
        </div>
        {headerExtra}
        <div className={s.body}>{children}</div>
        {footer ? <div className={s.footer}>{footer}</div> : null}
      </div>
    </div>,
    document.querySelector('.kash-app') ?? document.body,
  );
}

export { s as modalStyles };
