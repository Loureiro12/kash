import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';
import { authenticate, getBiometricSupport, LOCK_AFTER_MS, type BiometricSupport } from '@/services/biometrics';
import { useKashStore } from '@/store';

/** Suporte do aparelho (carregado uma vez e sempre que o app volta, pois a pessoa pode cadastrar nos Ajustes). */
export function useBiometricSupport() {
  const [support, setSupport] = useState<BiometricSupport | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () => void getBiometricSupport().then((s) => alive && setSupport(s));
    load();
    const sub = AppState.addEventListener('change', (state) => state === 'active' && load());
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return support;
}

/**
 * Liga/desliga "Entrar com Face ID". Ligar pede a biometria (confirma que funciona e que é o dono);
 * sem biometria cadastrada, explica e leva aos Ajustes.
 */
export function useBiometricToggle(support: BiometricSupport | null) {
  const enabled = useKashStore((s) => s.settings.biometrics);
  const setBiometrics = useKashStore((s) => s.setBiometrics);
  const showToast = useKashStore((s) => s.showToast);
  const [busy, setBusy] = useState(false);

  const toggle = useCallback(
    async (next?: boolean) => {
      const turnOn = next ?? !enabled;
      if (busy || turnOn === enabled) return;
      if (!turnOn) {
        setBiometrics(false);
        showToast(`${support?.label ?? 'Biometria'} desativado`);
        return;
      }
      if (!support?.hasHardware) {
        showToast('Este aparelho não tem biometria');
        return;
      }
      if (!support.enrolled) {
        showToast(`Cadastre o ${support.label} nos Ajustes do aparelho primeiro`, { label: 'Abrir', onPress: () => void Linking.openSettings() });
        return;
      }
      setBusy(true);
      const result = await authenticate(`Confirme para ativar o ${support.label}`);
      setBusy(false);
      if (result.ok) {
        setBiometrics(true);
        showToast(`${support.label} ativado`);
      } else if (!result.cancelled) {
        showToast(result.message);
      }
    },
    [busy, enabled, setBiometrics, showToast, support],
  );

  return { enabled, toggle, busy };
}

/** Tranca o app ao voltar depois de LOCK_AFTER_MS em segundo plano (só com a preferência ligada). */
export function useAutoLock() {
  const lock = useKashStore((s) => s.lock);
  const leftAt = useRef<number | null>(null);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      // o prompt do Face ID deixa o app "inactive", não "background": ele não conta como saída
      if (state === 'background') leftAt.current = Date.now();
      if (state === 'active' && leftAt.current !== null) {
        const away = Date.now() - leftAt.current;
        leftAt.current = null;
        if (away >= LOCK_AFTER_MS) lock();
      }
    });
    return () => sub.remove();
  }, [lock]);
}
