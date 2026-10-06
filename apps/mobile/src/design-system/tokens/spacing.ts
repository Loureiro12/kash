/** Escala de espaçamento (px). Valores do handoff mapeados em nomes semânticos. */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  xxl: 14,
  xxxl: 16,
  '4xl': 18,
  '5xl': 20,
  '6xl': 22,
  '7xl': 24,
  '8xl': 26,
  '9xl': 32,
} as const;

/** Layout de tela. */
export const layout = {
  /** padding horizontal da tela */
  screenPaddingX: 20,
  /** espaço extra abaixo do status bar (somado ao inset) */
  screenPaddingTopExtra: 12,
  /** padding inferior para a tab bar flutuante não cobrir o conteúdo */
  screenPaddingBottom: 110,
  /** gap entre cards em lista */
  listGap: 10,
  /** gap entre blocos */
  blockGap: 12,
  /** gap entre seções */
  sectionGap: 26,
  /** tab bar */
  tabBarHeight: 66,
  tabBarSideInset: 20,
  tabBarBottomInset: 32,
  tabBarPlusSize: 54,
  /** alvo de toque mínimo */
  minTouchTarget: 44,
} as const;
