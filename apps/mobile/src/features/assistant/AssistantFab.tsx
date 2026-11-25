import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, Pressable, layout, shadows, staticColors, useTheme } from '@/design-system';

/** Balão flutuante do Início (acima da tab bar, à direita): abre o Assistente Kash. */
export function AssistantFab() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  // mesma conta da FloatingTabBar: fundo seguro + altura da barra + respiro
  const bottom = Math.max(insets.bottom - 2, 20) + layout.tabBarHeight + 22;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', right: layout.screenPaddingX, bottom }}>
      <Pressable
        onPress={() => router.push('/assistant')}
        haptic="light"
        pressedOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Abrir o assistente: pergunte sobre suas finanças"
        testID="home-assistant-fab"
        style={[{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }, shadows.tabBar]}
      >
        <Icon name="chat" size={24} color={staticColors.ink} />
        <View style={{ position: 'absolute', top: 10, right: 10 }}>
          <Icon name="sparkles" size={12} color={staticColors.ink} strokeWidth={2.4} />
        </View>
      </Pressable>
    </View>
  );
}
