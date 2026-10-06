import React from 'react';
import { View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { shadows } from '../tokens/shadows';
import { Pressable } from './Pressable';
import { Text } from './Text';

export interface ToastProps {
  message: string | null;
  actionLabel?: string | null;
  onAction?: (() => void) | null;
}

/** Toast no topo: fundo text, texto bg 13/600, ponto verde 8px. */
export function Toast({ message, actionLabel, onAction }: ToastProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  if (!message) return null;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + 12, left: 20, right: 20, zIndex: 40 }}>
      <Animated.View
        testID="toast"
        pointerEvents="box-none"
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        entering={FadeInUp.duration(250)}
        exiting={FadeOutUp.duration(200)}
        style={[
          { paddingVertical: 14, paddingHorizontal: 18, borderRadius: 16, backgroundColor: colors.text, flexDirection: 'row', alignItems: 'center', gap: 10 },
          shadows.toast,
        ]}
      >
        {/* o corpo do toast não captura toques: o que estiver embaixo (ex.: botão voltar) continua clicável */}
        <View pointerEvents="none" style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent }} />
          <Text variant="bodySemibold" color={colors.bg} style={{ flex: 1 }} numberOfLines={2}>
            {message}
          </Text>
        </View>
        {actionLabel && onAction ? (
          <Pressable onPress={onAction} testID="toast-action" accessibilityRole="button" hitSlop={8} style={{ paddingVertical: 4, paddingLeft: 6 }}>
            <Text variant="chipBold" color={colors.accentText === colors.accent ? colors.bg : colors.accent}>
              {actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}
