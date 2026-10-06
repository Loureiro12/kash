import { Stack } from 'expo-router';
import React from 'react';
import { useTheme } from '@/design-system';
import { useKashStore } from '@/store';

export default function AuthLayout() {
  const { colors } = useTheme();
  const auth = useKashStore((s) => s.auth);
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Protected guard={auth === 'onboarding'}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Screen name="login" />
    </Stack>
  );
}
