import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ErrorState, ScreenSkeleton } from '@/design-system';
import { useKashStore } from '@/store';

/**
 * Decide entre esqueleto, erro ou conteúdo conforme `ui.dataStatus`.
 * Na fase visual o status é sempre "ready"; a integração passa a controlá-lo (e o retry recarrega).
 */
export function DataGate({ children, skeleton, onRetry }: { children: React.ReactNode; skeleton?: React.ReactNode; onRetry?: () => void }) {
  const status = useKashStore((s) => s.ui.dataStatus);
  const queryClient = useQueryClient();
  if (status === 'loading') return <>{skeleton ?? <ScreenSkeleton />}</>;
  if (status === 'error') return <ErrorState onRetry={onRetry ?? (() => void queryClient.refetchQueries({ queryKey: ['snapshot'] }))} />;
  return <>{children}</>;
}
