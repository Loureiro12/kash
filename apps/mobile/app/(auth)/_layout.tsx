import { Stack } from 'expo-router';
import React from 'react';
import { useTheme } from '@/design-system';
import { useKashStore } from '@/store';

export default function AuthLayout() {
  const { colors } = useTheme();
  const auth = useKashStore((s) => s.auth);
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: colors.bg } }}>
      {/* o estado de auth decide a tela: onboarding só no primeiro uso; login/cadastro/esqueci só depois dele */}
      <Stack.Protected guard={auth === 'onboarding'}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={auth !== 'onboarding'}>
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="forgot" options={{ animation: 'slide_from_right' }} />
      </Stack.Protected>
    </Stack>
  );
}
