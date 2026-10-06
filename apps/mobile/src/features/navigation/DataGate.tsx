import React from 'react';
import { ErrorState, ScreenSkeleton } from '@/design-system';
import { useKashStore } from '@/store';

/**
 * Decide entre esqueleto, erro ou conteúdo conforme `ui.dataStatus`.
 * Na fase visual o status é sempre "ready"; a integração passa a controlá-lo (e o retry recarrega).
 */
export function DataGate({ children, skeleton, onRetry }: { children: React.ReactNode; skeleton?: React.ReactNode; onRetry?: () => void }) {
  const status = useKashStore((s) => s.ui.dataStatus);
  const setDataStatus = useKashStore((s) => s.setDataStatus);
  if (status === 'loading') return <>{skeleton ?? <ScreenSkeleton />}</>;
  if (status === 'error') return <ErrorState onRetry={onRetry ?? (() => setDataStatus('ready'))} />;
  return <>{children}</>;
}
