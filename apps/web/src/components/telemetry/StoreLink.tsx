'use client';

import { track } from '@/lib/telemetry';

/** Link para uma loja que registra o clique (evento `store_click`). */
export function StoreLink({ store, placement, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { store: 'app_store' | 'google_play'; placement: string; 'data-testid'?: string }) {
  return <a {...props} onClick={() => track('store_click', { store, placement })} />;
}
