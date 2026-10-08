import { Stack } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/design-system';
import { FloatingTabBar } from '@/features/navigation/FloatingTabBar';
import { SheetsHost } from '@/features/navigation/SheetsHost';
import { useServerSync } from '@/data/useServerSync';
import { useNotificationRouting, useReminderSync } from '@/features/notifications';
import { useKashStore } from '@/store';

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
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="(tabs)" />
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
