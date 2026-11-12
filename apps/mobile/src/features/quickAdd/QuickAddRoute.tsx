import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { track } from '@/services/telemetry';
import { useKashStore } from '@/store';
import { kindFromParam } from './quickAdd';

/**
 * Link `com.andreloureiro.kash://lancar?tipo=gasto|entrada` (atalho "Abrir URL", automações, Android):
 * pede o lançamento rápido e volta para onde estava (ou para o Início, se o app abriu pelo link).
 */
export function QuickAddRoute() {
  const router = useRouter();
  const { tipo } = useLocalSearchParams<{ tipo?: string }>();
  const requestQuickAdd = useKashStore((s) => s.requestQuickAdd);
  useEffect(() => {
    const kind = kindFromParam(tipo);
    track('quick_add', { kind, via: 'link' });
    requestQuickAdd(kind);
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [tipo, requestQuickAdd, router]);
  return null;
}
