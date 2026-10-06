import { Stack } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/design-system';
import { FloatingTabBar } from '@/features/navigation/FloatingTabBar';
import { SheetsHost } from '@/features/navigation/SheetsHost';

/**
 * Área logada: Stack (abas + páginas internas) com a tab bar flutuante
 * sobreposta — ela permanece visível em páginas internas, sem aba ativa.
 */
export default function AppLayout() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="report" />
        <Stack.Screen name="forecast" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="terms" />
        <Stack.Screen name="privacy" />
      </Stack>
      <FloatingTabBar />
      <SheetsHost />
    </View>
  );
}
