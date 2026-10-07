import { useEffect } from 'react';
import { Linking } from 'react-native';
import { useKashStore } from '@/store';

/**
 * Deep links de auth (hoje só `kash://reset-password…`, vindo do e-mail de recuperação).
 * Cobre o app fechado (URL inicial) e aberto/em segundo plano (evento).
 */
export function useAuthLinks() {
  const handleAuthUrl = useKashStore((s) => s.handleAuthUrl);
  useEffect(() => {
    void Linking.getInitialURL().then((url) => {
      if (url) void handleAuthUrl(url);
    });
    const sub = Linking.addEventListener('url', ({ url }) => void handleAuthUrl(url));
    return () => sub.remove();
  }, [handleAuthUrl]);
}
