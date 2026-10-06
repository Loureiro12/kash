import { Tabs } from 'expo-router';
import React from 'react';
import { useTheme } from '@/design-system';

/** Abas sem tab bar nativa — a FloatingTabBar vive no layout pai. */
export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs tabBar={() => null} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg }, lazy: true }} backBehavior="history">
      <Tabs.Screen name="index" options={{ title: 'Início' }} />
      <Tabs.Screen name="cards" options={{ title: 'Cartões' }} />
      <Tabs.Screen name="accounts" options={{ title: 'Contas' }} />
      <Tabs.Screen name="goals" options={{ title: 'Metas' }} />
    </Tabs>
  );
}
