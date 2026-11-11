'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { initTelemetry, reportError, trackPage } from '@/lib/telemetry';
import { ConsentBanner } from './ConsentBanner';

/** Liga o Firebase (se configurado), registra cada página vista e os erros sem tratamento. */
export function TelemetryProvider() {
  const pathname = usePathname();

  useEffect(() => {
    void initTelemetry();
    const onError = (e: ErrorEvent) => reportError(e.error ?? e.message);
    const onRejection = (e: PromiseRejectionEvent) => reportError(e.reason);
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  useEffect(() => {
    if (pathname) trackPage(pathname);
  }, [pathname]);

  return <ConsentBanner />;
}
