import { LinearGradient } from 'expo-linear-gradient';
import { usePathname, useRouter, type Href } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, Pressable, Text, layout, radii, shadows, useTheme, withAlpha, type IconName } from '@/design-system';
import { useKashStore } from '@/store';

interface TabDef {
  key: string;
  label: string;
  icon: IconName;
  href: Href;
  match: (pathname: string) => boolean;
}

const TABS: TabDef[] = [
  { key: 'home', label: 'Início', icon: 'home', href: '/', match: (p) => p === '/' || p === '/index' },
  { key: 'cards', label: 'Cartões', icon: 'card', href: '/cards', match: (p) => p.startsWith('/cards') },
  { key: 'accounts', label: 'Contas', icon: 'wallet', href: '/accounts', match: (p) => p.startsWith('/accounts') },
  { key: 'goals', label: 'Metas', icon: 'target', href: '/goals', match: (p) => p.startsWith('/goals') },
];

/**
 * Tab bar flutuante (pílula 66px, 20px das laterais, 32px do fundo) com 4 abas
 * e botão central + (54px). Em páginas internas nenhuma aba fica ativa.
 */
export function FloatingTabBar() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const openSheet = useKashStore((s) => s.openSheet);
  const bottom = Math.max(insets.bottom - 2, 20);

  // boas-vindas do primeiro acesso: tela focada, sem a tab bar
  if (pathname === '/welcome') return null;

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }} testID="tab-bar">
      <LinearGradient
        pointerEvents="none"
        colors={[withAlpha(colors.bg, 0), colors.bg, colors.bg]}
        locations={[0, 0.3, 1]}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: layout.tabBarHeight + bottom + 24 }}
      />
      <View style={{ paddingHorizontal: layout.tabBarSideInset, paddingBottom: bottom, paddingTop: 10 }}>
        <View
          style={[
            {
              flexDirection: 'row',
              alignItems: 'center',
              height: layout.tabBarHeight,
              borderRadius: radii.pill,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.line,
              paddingHorizontal: 8,
            },
            shadows.tabBar,
          ]}
        >
          {TABS.slice(0, 2).map((t) => (
            <TabButton key={t.key} tab={t} active={t.match(pathname)} onPress={() => router.navigate(t.href)} />
          ))}
          <Pressable
            onPress={() => openSheet('expense')}
            testID="tab-add"
            haptic="medium"
            accessibilityRole="button"
            accessibilityLabel="Lançar gasto"
            style={[
              {
                width: layout.tabBarPlusSize,
                height: layout.tabBarPlusSize,
                borderRadius: layout.tabBarPlusSize / 2,
                backgroundColor: colors.accent,
                alignItems: 'center',
                justifyContent: 'center',
              },
              shadows.plusButton,
            ]}
          >
            <Icon name="plus" size={24} color={colors.onAccent} strokeWidth={2.8} />
          </Pressable>
          {TABS.slice(2).map((t) => (
            <TabButton key={t.key} tab={t} active={t.match(pathname)} onPress={() => router.navigate(t.href)} />
          ))}
        </View>
      </View>
    </View>
  );
}

function TabButton({ tab, active, onPress }: { tab: TabDef; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const color = active ? colors.accentText : colors.muted;
  return (
    <Pressable
      onPress={onPress}
      testID={`tab-${tab.key}`}
      haptic="selection"
      accessibilityRole="tab"
      accessibilityLabel={tab.label}
      accessibilityState={{ selected: active }}
      style={{ flex: 1, height: 52, alignItems: 'center', justifyContent: 'center', gap: 4 }}
    >
      <Icon name={tab.icon} size={22} color={color} />
      <Text variant="tab" color={color}>
        {tab.label}
      </Text>
    </Pressable>
  );
}
