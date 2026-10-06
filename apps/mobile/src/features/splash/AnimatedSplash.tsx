import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Text, fontFamily, staticColors } from '@/design-system';

/**
 * Splash animada (spec em assets/brand/README.md): continua a splash nativa
 * (fundo #C6F432 + logo) e termina com fade/scale para a primeira tela.
 * Toque em qualquer lugar pula para o final.
 */
export interface AnimatedSplashProps {
  onFinish: () => void;
  /** segura a saída até estar true (ex.: sessão lida) */
  holdUntil?: boolean;
}

const OVERSHOOT = Easing.bezier(0.34, 1.56, 0.64, 1);
const SMOOTH = Easing.bezier(0.2, 0.8, 0.2, 1);
const LINEAR_ISH = Easing.bezier(0.4, 0, 0.2, 1);
const EXIT_AT = 2350;
const EXIT_MS = 450;

export const SPLASH_TOTAL_MS = EXIT_AT + EXIT_MS;

export function AnimatedSplash({ onFinish, holdUntil = true }: AnimatedSplashProps) {
  const [skipped, setSkipped] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  // sai quando o tempo acabou (ou o usuário pulou) e nada mais segura a splash
  const exiting = holdUntil && (timeUp || skipped);

  const iconScale = useSharedValue(0.4);
  const iconRotate = useSharedValue(-12);
  const dotScale = useSharedValue(0);
  const dotOffset = useSharedValue(60);
  const groupY = useSharedValue(0);
  const wordY = useSharedValue(1.1);
  const tagOpacity = useSharedValue(0);
  const tagY = useSharedValue(8);
  const barScale = useSharedValue(0);
  const rootOpacity = useSharedValue(1);
  const rootScale = useSharedValue(1);

  useEffect(() => {
    // 1. ícone entra com overshoot
    iconScale.value = withDelay(100, withSequence(withTiming(1.08, { duration: 460, easing: OVERSHOOT }), withTiming(1, { duration: 240, easing: SMOOTH })));
    iconRotate.value = withDelay(100, withSequence(withTiming(2, { duration: 460, easing: OVERSHOOT }), withTiming(0, { duration: 240, easing: SMOOTH })));
    // 2. ponto cai no lugar
    dotOffset.value = withDelay(550, withTiming(0, { duration: 550, easing: OVERSHOOT }));
    dotScale.value = withDelay(550, withSequence(withTiming(1.25, { duration: 360, easing: OVERSHOOT }), withTiming(1, { duration: 190, easing: SMOOTH })));
    // 3. conjunto sobe
    groupY.value = withDelay(950, withTiming(-120, { duration: 900, easing: SMOOTH }));
    // 4. wordmark revela de baixo (com clip)
    wordY.value = withDelay(1000, withTiming(0, { duration: 550, easing: SMOOTH }));
    // 5. tagline
    tagOpacity.value = withDelay(1350, withTiming(1, { duration: 500, easing: SMOOTH }));
    tagY.value = withDelay(1350, withTiming(0, { duration: 500, easing: SMOOTH }));
    // 6. barra de progresso
    barScale.value = withDelay(500, withTiming(1, { duration: 1900, easing: LINEAR_ISH }));
    // 7. saída (quando o tempo acabar e nada mais segurar)
    const t = setTimeout(() => setTimeUp(true), EXIT_AT);
    return () => clearTimeout(t);
  }, [iconScale, iconRotate, dotOffset, dotScale, groupY, wordY, tagOpacity, tagY, barScale]);

  useEffect(() => {
    if (!exiting) return;
    rootScale.value = withTiming(1.06, { duration: EXIT_MS, easing: Easing.in(Easing.ease) });
    rootOpacity.value = withTiming(0, { duration: EXIT_MS, easing: Easing.in(Easing.ease) }, (finished) => {
      if (finished) runOnJS(onFinish)();
    });
  }, [exiting, rootOpacity, rootScale, onFinish]);

  const rootStyle = useAnimatedStyle(() => ({ opacity: rootOpacity.value, transform: [{ scale: rootScale.value }] }));
  const groupStyle = useAnimatedStyle(() => ({ transform: [{ translateY: groupY.value }] }));
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: iconScale.value }, { rotate: `${iconRotate.value}deg` }] }));
  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dotOffset.value }, { translateY: -dotOffset.value }, { scale: dotScale.value }],
  }));
  const wordStyle = useAnimatedStyle(() => ({ transform: [{ translateY: wordY.value * 56 }] }));
  const tagStyle = useAnimatedStyle(() => ({ opacity: tagOpacity.value, transform: [{ translateY: tagY.value }] }));
  const barStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: barScale.value }] }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, rootStyle]} pointerEvents={exiting ? 'none' : 'auto'} testID="splash">
      <Pressable style={StyleSheet.absoluteFill} onPress={() => setSkipped(true)} accessibilityLabel="Pular abertura" testID="splash-skip" />
      <Animated.View style={[styles.group, groupStyle]} pointerEvents="none">
        <View style={styles.iconWrap}>
          <Animated.View style={[styles.icon, iconStyle]}>
            <Text style={styles.k}>K</Text>
          </Animated.View>
          <Animated.View style={[styles.dot, dotStyle]} />
        </View>
        <View style={styles.wordClip}>
          <Animated.View style={wordStyle}>
            <Text style={styles.word}>Kash</Text>
          </Animated.View>
        </View>
        <Animated.Text style={[styles.tag, tagStyle]}>sua grana, sem mistério</Animated.Text>
      </Animated.View>
      <View style={styles.barTrack} pointerEvents="none">
        <Animated.View style={[styles.bar, barStyle]} />
      </View>
    </Animated.View>
  );
}

const ICON = 150;

const styles = StyleSheet.create({
  root: { backgroundColor: staticColors.brandGreen, alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  group: { alignItems: 'center', gap: 22 },
  iconWrap: { width: ICON, height: ICON },
  icon: {
    width: ICON,
    height: ICON,
    borderRadius: 40,
    backgroundColor: staticColors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  k: { fontFamily: fontFamily.extrabold, fontSize: 104, lineHeight: 112, color: staticColors.brandGreen, marginTop: -4 },
  dot: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: staticColors.ink,
    borderWidth: 5,
    borderColor: staticColors.brandGreen,
  },
  wordClip: { height: 56, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' },
  word: { fontFamily: fontFamily.extrabold, fontSize: 44, lineHeight: 52, letterSpacing: -1.5, color: staticColors.ink },
  tag: { fontFamily: fontFamily.medium, fontSize: 16, color: staticColors.ink, opacity: 0.75, marginTop: -8 },
  barTrack: { position: 'absolute', bottom: 64, width: 64, height: 4, borderRadius: 2, backgroundColor: 'rgba(11,12,14,0.15)', overflow: 'hidden' },
  bar: { width: '100%', height: '100%', backgroundColor: staticColors.ink, transformOrigin: 'left' },
});
