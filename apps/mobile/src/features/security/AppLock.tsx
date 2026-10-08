import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Icon, staticColors, Text, useTheme } from '@/design-system';
import { authenticate } from '@/services/biometrics';
import { useKashStore } from '@/store';
import { useBiometricSupport } from './useBiometrics';

/**
 * Tela de bloqueio por cima de tudo enquanto `locked`. Pede a biometria sozinha quando fica visível
 * (depois da splash) e oferece "Entrar com senha", que encerra a sessão e volta ao login.
 */
export function AppLock({ ready }: { ready: boolean }) {
  const locked = useKashStore((s) => s.locked && s.auth === 'app');
  if (!locked) return null;
  return <LockOverlay ready={ready} />;
}

function LockOverlay({ ready }: { ready: boolean }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const support = useBiometricSupport();
  const unlock = useKashStore((s) => s.unlock);
  const logout = useKashStore((s) => s.logout);
  const name = useKashStore((s) => s.user.name.split(' ')[0] ?? '');
  const [message, setMessage] = useState<string | null>(null);
  const [trying, setTrying] = useState(false);
  const autoTried = useRef(false);
  const label = support?.label ?? 'biometria';

  const tryUnlock = useCallback(async () => {
    if (trying) return;
    setTrying(true);
    setMessage(null);
    const result = await authenticate('Desbloquear o Kash');
    setTrying(false);
    if (result.ok) unlock();
    else if (!result.cancelled) setMessage(result.message);
  }, [trying, unlock]);

  useEffect(() => {
    if (!ready || !support || autoTried.current) return;
    autoTried.current = true;
    void tryUnlock();
  }, [ready, support, tryUnlock]);

  return (
    <View
      testID="app-lock"
      accessibilityViewIsModal
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, backgroundColor: colors.bg, paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 20) + 24, paddingHorizontal: 24 }}
    >
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="lock" size={32} color={staticColors.ink} strokeWidth={2.4} />
        </View>
        <Text variant="pageTitle" align="center">
          {name ? `Oi, ${name}` : 'Kash bloqueado'}
        </Text>
        <Text variant="body" color="muted" align="center" style={{ maxWidth: 280 }}>
          Use o {label} pra ver suas finanças.
        </Text>
        {message ? (
          <Text variant="bodyMedium" color="neg" align="center" testID="app-lock-error">
            {message}
          </Text>
        ) : null}
      </View>
      <View style={{ gap: 10 }}>
        <Button label={`Desbloquear com ${label}`} onPress={() => void tryUnlock()} loading={trying} testID="app-lock-unlock" haptic="medium" />
        <Button label="Entrar com senha" variant="secondary" onPress={() => void logout()} testID="app-lock-password" />
      </View>
    </View>
  );
}
