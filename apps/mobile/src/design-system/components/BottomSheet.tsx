import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, View, useWindowDimensions, type TextInput } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { motion } from '../tokens/motion';
import { radii } from '../tokens/radii';
import { IconButton } from './IconButton';
import { Pressable } from './Pressable';
import { Text } from './Text';

interface SheetScrollContextValue {
  /** rola o conteúdo do sheet até o nó ficar visível (usado por Input ao receber foco) */
  ensureVisible: (node: TextInput | View | null) => void;
}

const SheetScrollContext = createContext<SheetScrollContextValue | null>(null);

/** Disponível para componentes dentro de um BottomSheet rolável (null fora dele). */
export function useSheetScroll(): SheetScrollContextValue | null {
  return useContext(SheetScrollContext);
}

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** substitui o título por um controle (ex.: segmentado compacto) */
  headerContent?: React.ReactNode;
  children: React.ReactNode;
  testID?: string;
  /** gap entre filhos (default 14) */
  gap?: number;
  /** conteúdo rolável quando não cabe (default true) */
  scrollable?: boolean;
  /** rodapé fixo (CTA) — fica sempre visível, mesmo com teclado aberto ou conteúdo rolando */
  footer?: React.ReactNode;
}

/**
 * Bottom sheet com overlay rgba(0,0,0,.5), raio 30 no topo, handle 40×4,
 * entrada translateY(40→0)+opacity em 300ms cubic-bezier(.2,.8,.2,1).
 */
export function BottomSheet({ visible, onClose, title, headerContent, children, testID, gap = 14, scrollable = true, footer }: BottomSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);
  const scrollRef = useRef<ScrollView>(null);
  const offsetRef = useRef(0);

  const ensureVisible = useCallback((node: TextInput | View | null) => {
    const run = () => {
      const sv = scrollRef.current;
      const host = sv?.getNativeScrollRef?.();
      if (!sv || !host || !node) return;
      node.measureInWindow((_x, nodeY, _w, nodeH) => {
        host.measureInWindow((_sx, svY, _sw, svH) => {
          const top = nodeY - svY;
          const bottom = top + nodeH;
          if (top < 0) sv.scrollTo({ y: Math.max(0, offsetRef.current + top - 12), animated: true });
          else if (bottom > svH) sv.scrollTo({ y: offsetRef.current + (bottom - svH) + 12, animated: true });
        });
      });
    };
    // mede depois que o teclado reposicionou o sheet; fallback por tempo caso o teclado já esteja aberto
    const sub = Keyboard.addListener('keyboardDidShow', () => {
      run();
      sub.remove();
    });
    const t = setTimeout(() => {
      run();
      sub.remove();
    }, 350);
    return () => clearTimeout(t);
  }, []);
  const scrollCtx = useMemo(() => ({ ensureVisible }), [ensureVisible]);

  // Monta imediatamente ao abrir (estado derivado da prop, ajustado durante o render).
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      progress.value = withTiming(1, { duration: motion.duration.sheet, easing: motion.easing.sheet });
    } else {
      progress.value = withTiming(0, { duration: motion.duration.fast, easing: motion.easing.standard }, (finished) => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
  }, [visible, progress]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * motion.sheetOffset }],
  }));

  if (!mounted) return null;

  const body = (
    <View style={{ gap }}>
      {title || headerContent ? (
        <View style={styles.header}>
          {headerContent ?? <Text variant="titleLg">{title}</Text>}
          <IconButton icon="close" size={32} subtle onPress={onClose} accessibilityLabel="Fechar" testID={testID ? `${testID}-close` : undefined} />
        </View>
      ) : null}
      {children}
    </View>
  );

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      {/* durante o fechamento o sheet não deve capturar toques (a tela de trás já é interativa) */}
      <View style={[styles.root, { paddingTop: insets.top }]} pointerEvents={visible ? 'auto' : 'none'}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }, overlayStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fechar" testID={testID ? `${testID}-overlay` : undefined} pressedOpacity={1} />
        </Animated.View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kav} pointerEvents="box-none">
          <Animated.View
            testID={testID}
            accessibilityViewIsModal
            style={[
              styles.sheet,
              {
                backgroundColor: colors.bg,
                borderTopLeftRadius: radii.sheet,
                borderTopRightRadius: radii.sheet,
                paddingBottom: Math.max(insets.bottom, 20) + 20,
                // Percentual aqui resolveria contra o container (dimensionado pelo conteúdo),
                // então o limite vem da janela, sempre abaixo da status bar.
                maxHeight: Math.round(windowHeight - insets.top - 8),
              },
              sheetStyle,
            ]}
          >
            <View style={[styles.handle, { backgroundColor: colors.line }]} />
            {scrollable ? (
              <SheetScrollContext.Provider value={scrollCtx}>
                <ScrollView
                  ref={scrollRef}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  showsVerticalScrollIndicator={false}
                  bounces={false}
                  style={{ flexGrow: 0 }}
                  onScroll={(e) => {
                    offsetRef.current = e.nativeEvent.contentOffset.y;
                  }}
                  scrollEventThrottle={16}
                >
                  {body}
                </ScrollView>
              </SheetScrollContext.Provider>
            ) : (
              body
            )}
            {footer ? <View style={{ marginTop: gap, gap }}>{footer}</View> : null}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  kav: { justifyContent: 'flex-end', maxHeight: '100%' },
  // flexShrink: com o teclado aberto o sheet encolhe para o espaço restante e o conteúdo rola
  sheet: { paddingTop: 14, paddingHorizontal: 20, flexShrink: 1 },
  handle: { width: 40, height: 4, borderRadius: 99, alignSelf: 'center', marginBottom: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
});
