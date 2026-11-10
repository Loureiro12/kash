import * as AppleAuthentication from 'expo-apple-authentication';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { AppleLogo, GoogleLogo, Pressable, Text, useTheme } from '@/design-system';
import type { SocialProvider } from '@kash/supabase-client';
import { nativeAppleAvailable } from '@/services/socialAuth';
import { useKashStore } from '@/store';

/**
 * "Continuar com Apple" e "Continuar com Google" (entrar ou criar conta). No iPhone a Apple usa o
 * botão e a folha nativos; fora dele, os dois abrem o login do provedor no navegador do sistema.
 */
export function SocialButtons({ disabled, testID = 'auth-social' }: { disabled?: boolean; testID?: string }) {
  const { colors, isDark } = useTheme();
  const signInWithProvider = useKashStore((s) => s.signInWithProvider);
  const loading = useKashStore((s) => s.authRequest.status === 'loading');
  const [busy, setBusy] = useState<SocialProvider | null>(null);
  const [nativeApple, setNativeApple] = useState(false);

  useEffect(() => {
    void nativeAppleAvailable().then(setNativeApple);
  }, []);

  const start = async (provider: SocialProvider) => {
    if (loading) return;
    setBusy(provider);
    await signInWithProvider(provider);
    setBusy(null);
  };

  const blocked = disabled || loading;
  const button = (provider: SocialProvider, label: string, logo: React.ReactNode) => (
    <Pressable
      onPress={() => void start(provider)}
      disabled={blocked}
      haptic="light"
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: blocked, busy: busy === provider }}
      testID={`auth-${provider}`}
      style={{ height: 52, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: blocked && busy !== provider ? 0.5 : 1 }}
    >
      {logo}
      <Text variant="buttonSecondary">{busy === provider ? 'Abrindo…' : label}</Text>
    </Pressable>
  );

  return (
    <View style={{ gap: 10 }} testID={testID}>
      {nativeApple ? (
        <View style={{ opacity: blocked ? 0.5 : 1 }} pointerEvents={blocked ? 'none' : 'auto'}>
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={isDark ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={16}
            style={{ height: 52, width: '100%' }}
            onPress={() => void start('apple')}
            testID="auth-apple"
          />
        </View>
      ) : (
        button('apple', 'Continuar com Apple', <AppleLogo color={colors.text} />)
      )}
      {button('google', 'Continuar com Google', <GoogleLogo />)}
    </View>
  );
}

/** "ou com e-mail" entre os botões sociais e o formulário. */
export function OrDivider({ label = 'ou com e-mail' }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
      <Text variant="meta" color="muted">
        {label}
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
    </View>
  );
}
