'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ConfirmHost } from '@/components/app/Confirm';
import { Toast } from '@/components/app/Toast';
import { THEME_STORAGE_KEY } from '@/kash/actions';
import { makeQueryClient } from '@/kash/data';
import { SessionProvider } from '@/kash/session';
import { useTheme } from '@/kash/theme';

/**
 * Raiz do Kash web (login + app): cache de dados, sessão, tema e camadas globais (toast, confirmação).
 * O tema vem do perfil quando os dados chegam; antes disso, do último tema usado neste navegador.
 */
export function KashRoot({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);
  const theme = useTheme((s) => s.theme);
  const setTheme = useTheme((s) => s.setTheme);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') setTheme(saved);
    } catch {
      // armazenamento bloqueado: fica o tema escuro padrão
    }
  }, [setTheme]);

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <div className="kash-app" data-theme={theme}>
          {children}
          <Toast />
          <ConfirmHost />
        </div>
      </SessionProvider>
    </QueryClientProvider>
  );
}
