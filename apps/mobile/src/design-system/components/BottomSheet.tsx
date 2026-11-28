import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, View, useWindowDimensions, type TextInput } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { useKeyboardInset } from './keyboard';
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

/** Disponível para componentes dentro de um BottomSheet ou Screen rolável (null fora deles). */
export function useSheetScroll(): SheetScrollContextValue | null {
  return useContext(SheetScrollContext);
}

/** Provider usado pelo Screen para que os Inputs também rolem até ficar visíveis. */
export const ScrollIntoViewProvider = SheetScrollContext.Provider;

/**
 * Rolar um ScrollView até um campo ficar visível acima do teclado. Devolve a ref do ScrollView,
 * o handler de rolagem (para saber o deslocamento atual) e `ensureVisible`, que os Inputs chamam ao focar.
 */
export function useScrollIntoView() {
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
    // mede depois que o teclado reposicionou a tela (no Android o espaço do teclado entra num render
    // depois do evento); fallback por tempo caso o teclado já esteja aberto
    const sub = Keyboard.addListener('keyboardDidShow', () => {
      setTimeout(run, Platform.OS === 'android' ? 120 : 0);
      sub.remove();
    });
    const t = setTimeout(() => {
      run();
      sub.remove();
    }, 400);
    return () => clearTimeout(t);
  }, []);
  const onScrollOffset = useCallback((y: number) => {
    offsetRef.current = y;
  }, []);
  const ctx = useMemo(() => ({ ensureVisible }), [ensureVisible]);
  return { scrollRef, onScrollOffset, ctx };
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
  const keyboardUp = useKeyboardVisible();
  const keyboardInset = useKeyboardInset();
  const { scrollRef, onScrollOffset, ctx: scrollCtx } = useScrollIntoView();


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
      {/* no Android (edge-to-edge) o espaço do teclado entra aqui; no iOS, pelo KeyboardAvoidingView */}
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: keyboardInset }]} pointerEvents={visible ? 'auto' : 'none'}>
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
                // com o teclado aberto a área segura de baixo fica atrás dele: sobra mais espaço para o conteúdo
                paddingBottom: keyboardUp ? 12 : Math.max(insets.bottom, 20) + 20,
                // Percentual aqui resolveria contra o container (dimensionado pelo conteúdo),
                // então o limite vem da janela, sempre abaixo da status bar.
                maxHeight: Math.round(windowHeight - insets.top - 8 - keyboardInset),
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
                  onScroll={(e) => onScrollOffset(e.nativeEvent.contentOffset.y)}
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

function useKeyboardVisible(): boolean {
  const [up, setUp] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setUp(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setUp(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return up;
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  kav: { justifyContent: 'flex-end', maxHeight: '100%' },
  // flexShrink: com o teclado aberto o sheet encolhe para o espaço restante e o conteúdo rola
  sheet: { paddingTop: 14, paddingHorizontal: 20, flexShrink: 1 },
  handle: { width: 40, height: 4, borderRadius: 99, alignSelf: 'center', marginBottom: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
});
