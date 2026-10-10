import { Stack, usePathname, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useTheme } from '@/design-system';
import { FloatingTabBar } from '@/features/navigation/FloatingTabBar';
import { SheetsHost } from '@/features/navigation/SheetsHost';
import { useServerSync } from '@/data/useServerSync';
import { useNotificationRouting, useReminderSync } from '@/features/notifications';
import { DATA_SOURCE } from '@/data/source';
import { useKashStore, useOnboardingStatus } from '@/store';

/**
 * Área logada: Stack (abas + páginas internas) com a tab bar flutuante
 * sobreposta — ela permanece visível em páginas internas, sem aba ativa.
 */
export default function AppLayout() {
  const { colors } = useTheme();
  const userId = useKashStore((s) => s.userId);
  useServerSync(userId);
  useReminderSync();
  useNotificationRouting();
  useWelcomeRedirect();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="welcome" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="report" />
        <Stack.Screen name="transactions" />
        <Stack.Screen name="forecast" />
        <Stack.Screen name="profile/index" />
        <Stack.Screen name="profile/personal" />
        <Stack.Screen name="profile/security" />
        <Stack.Screen name="profile/budget" />
        <Stack.Screen name="profile/currency" />
        <Stack.Screen name="profile/categories" />
        <Stack.Screen name="profile/help" />
        <Stack.Screen name="terms" />
        <Stack.Screen name="privacy" />
      </Stack>
      <FloatingTabBar />
      <SheetsHost />
    </View>
  );
}

/**
 * Primeiro acesso: quem chega no Início sem nenhuma conta (e não pulou as boas-vindas) vai para
 * /welcome. Só com os dados do servidor já carregados (antes disso o store tem o seed).
 */
function useWelcomeRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const ready = useKashStore((s) => s.ui.dataStatus === 'ready');
  const { showWelcome } = useOnboardingStatus();
  useEffect(() => {
    if (DATA_SOURCE === 'remote' && ready && showWelcome && pathname === '/') router.replace('/welcome');
  }, [ready, showWelcome, pathname, router]);
}
