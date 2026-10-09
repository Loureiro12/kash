'use client';

import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState } from 'react';
import { getKashClient, isKashConfigured } from './client';

/** `unconfigured`: build sem as variáveis do Supabase (ex.: CI do site) */
export type SessionStatus = 'loading' | 'signedOut' | 'signedIn' | 'unconfigured';

export interface SessionState {
  status: SessionStatus;
  userId: string | null;
  email: string | null;
}

const SessionContext = createContext<SessionState>({ status: 'loading', userId: null, email: null });

const fromSession = (session: Session | null): SessionState =>
  session ? { status: 'signedIn', userId: session.user.id, email: session.user.email ?? null } : { status: 'signedOut', userId: null, email: null };

/** Acompanha a sessão do Supabase (guardada no navegador) e expõe o estado para as rotas. */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>(() => ({ status: isKashConfigured() ? 'loading' : 'unconfigured', userId: null, email: null }));

  useEffect(() => {
    const db = getKashClient();
    if (!db) return;
    let alive = true;
    void db.auth.getSession().then(({ data }) => {
      if (alive) setState(fromSession(data.session));
    });
    const { data } = db.auth.onAuthStateChange((_event, session) => {
      // o mesmo usuário renovando o token não precisa re-renderizar a árvore
      setState((prev) => {
        const next = fromSession(session);
        return prev.status === next.status && prev.userId === next.userId ? prev : next;
      });
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}

export const useSession = () => useContext(SessionContext);
