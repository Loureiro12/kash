import { Sora_400Regular, Sora_500Medium, Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold, useFonts } from '@expo-google-fonts/sora';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import React, { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { QUERY_CACHE_BUSTER, queryClient, queryPersister } from '@/data/queryClient';
import { installRemoteActions } from '@/data/remoteActions';
import { ThemeProvider, useTheme } from '@/design-system';
import { useAuthLinks } from '@/features/auth/useAuthLinks';
import { ToastHost } from '@/features/navigation/SheetsHost';
import { AnimatedSplash } from '@/features/splash/AnimatedSplash';
import { useKashStore } from '@/store';

void SplashScreen.preventAutoHideAsync();
installRemoteActions();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Sora_400Regular, Sora_500Medium, Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold });
  const theme = useKashStore((s) => s.settings.theme);
  // A splash nativa (logo estático) dá lugar à animada assim que as fontes carregam.
  const [splashDone, setSplashDone] = useState(false);
  const authReady = useKashStore((s) => s.auth !== 'booting');
  const finishSplash = useCallback(() => setSplashDone(true), []);

  useEffect(() => {
    if (fontsLoaded) void SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: queryPersister, buster: QUERY_CACHE_BUSTER }}>
        <ThemeProvider mode={theme}>
          <RootNavigator />
          {!splashDone || !authReady ? <AnimatedSplash onFinish={finishSplash} holdUntil={authReady} /> : null}
        </ThemeProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { colors, isDark } = useTheme();
  const auth = useKashStore((s) => s.auth);
  const rolloverIfNeeded = useKashStore((s) => s.rolloverIfNeeded);
  const bootstrapAuth = useKashStore((s) => s.bootstrapAuth);

  // Sessão guardada decide a primeira tela (a splash animada cobre a leitura).
  useEffect(() => {
    void bootstrapAuth();
  }, [bootstrapAuth]);
  useAuthLinks();

  // Virada de mês: ao abrir e sempre que o app volta pro primeiro plano.
  useEffect(() => {
    rolloverIfNeeded();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') rolloverIfNeeded();
    });
    return () => sub.remove();
  }, [rolloverIfNeeded]);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.bg);
  }, [colors.bg]);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Protected guard={auth !== 'app' && auth !== 'booting'}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={auth === 'app'}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
      </Stack>
      <ToastHost />
    </>
  );
}
