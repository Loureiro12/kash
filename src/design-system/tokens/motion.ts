import { Easing } from 'react-native-reanimated';

/** Durações e curvas de animação (ms). */
export const motion = {
  duration: {
    fast: 200,
    base: 250,
    sheet: 300,
    progress: 400,
    toast: 2200,
  },
  easing: {
    standard: Easing.inOut(Easing.ease),
    /** cubic-bezier(.2,.8,.2,1) — entrada de sheets */
    sheet: Easing.bezier(0.2, 0.8, 0.2, 1),
    out: Easing.out(Easing.ease),
  },
  /** translateY inicial dos sheets */
  sheetOffset: 40,
  /** scale dos cartões não selecionados */
  cardInactiveScale: 0.96,
} as const;
