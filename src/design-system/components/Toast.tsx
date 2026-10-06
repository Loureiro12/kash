import React from 'react';
import { View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { shadows } from '../tokens/shadows';
import { Text } from './Text';

export interface ToastProps {
  message: string | null;
}

/** Toast no topo: fundo text, texto bg 13/600, ponto verde 8px. */
export function Toast({ message }: ToastProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  if (!message) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: insets.top + 12, left: 20, right: 20, zIndex: 40 }}>
      <Animated.View
        testID="toast"
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        entering={FadeInUp.duration(250)}
        exiting={FadeOutUp.duration(200)}
        style={[
          { paddingVertical: 14, paddingHorizontal: 18, borderRadius: 16, backgroundColor: colors.text, flexDirection: 'row', alignItems: 'center', gap: 10 },
          shadows.toast,
        ]}
      >
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent }} />
        <Text variant="bodySemibold" color={colors.bg} style={{ flex: 1 }} numberOfLines={2}>
          {message}
        </Text>
      </Animated.View>
    </View>
  );
}
