/**
 * Tipografia — Sora (Google Fonts), pesos 400/500/600/700/800.
 * Os nomes das famílias batem com os exportados por @expo-google-fonts/sora.
 */
export const fontFamily = {
  regular: 'Sora_400Regular',
  medium: 'Sora_500Medium',
  semibold: 'Sora_600SemiBold',
  bold: 'Sora_700Bold',
  extrabold: 'Sora_800ExtraBold',
} as const;

export type FontWeightKey = keyof typeof fontFamily;

export interface TextStyleToken {
  fontSize: number;
  fontFamily: string;
  lineHeight?: number;
  letterSpacing?: number;
  textTransform?: 'uppercase' | 'none';
}

const ls = (size: number, em: number) => Math.round(size * em * 100) / 100;

export const textVariants = {
  /** Display onboarding: 46/1.02, 800, −0.04em */
  display: { fontSize: 46, fontFamily: fontFamily.extrabold, lineHeight: 47, letterSpacing: ls(46, -0.04) },
  /** Valor do sheet: 42, 800, −0.04em */
  amountSheet: { fontSize: 42, fontFamily: fontFamily.extrabold, lineHeight: 48, letterSpacing: ls(42, -0.04) },
  /** Saldo total: 36, 800, −0.03em */
  balance: { fontSize: 36, fontFamily: fontFamily.extrabold, lineHeight: 40, letterSpacing: ls(36, -0.03) },
  /** Valor em card grande: 30, 800 */
  amountLarge: { fontSize: 30, fontFamily: fontFamily.extrabold, lineHeight: 36, letterSpacing: ls(30, -0.03) },
  /** Login "Bem-vindo de volta": 30/800 */
  heroTitle: { fontSize: 30, fontFamily: fontFamily.extrabold, lineHeight: 36, letterSpacing: ls(30, -0.03) },
  /** Título de tela: 26, 800, −0.03em */
  screenTitle: { fontSize: 26, fontFamily: fontFamily.extrabold, lineHeight: 32, letterSpacing: ls(26, -0.03) },
  /** Valor do card "Gastos do mês" e fatura do cartão */
  amountCard: { fontSize: 26, fontFamily: fontFamily.extrabold, lineHeight: 30, letterSpacing: ls(26, -0.03) },
  /** Título de página interna: 22, 800, −0.03em */
  pageTitle: { fontSize: 22, fontFamily: fontFamily.extrabold, lineHeight: 28, letterSpacing: ls(22, -0.03) },
  /** Valores médios (A pagar / Pagas): 20/800 */
  amountMedium: { fontSize: 20, fontFamily: fontFamily.extrabold, lineHeight: 24, letterSpacing: ls(20, -0.02) },
  /** Tecla do teclado: 20/600 */
  key: { fontSize: 20, fontFamily: fontFamily.semibold, lineHeight: 24 },
  /** Nome no header / título de identidade: 16/700 */
  titleLg: { fontSize: 16, fontFamily: fontFamily.bold, lineHeight: 20 },
  /** Botão CTA: 16/700 */
  cta: { fontSize: 16, fontFamily: fontFamily.bold, lineHeight: 20 },
  /** Seção: 15/700 */
  section: { fontSize: 15, fontFamily: fontFamily.bold, lineHeight: 20 },
  /** Valor de item: 15/700 */
  valueLg: { fontSize: 15, fontFamily: fontFamily.bold, lineHeight: 20 },
  /** Botão secundário: 15/600 */
  buttonSecondary: { fontSize: 15, fontFamily: fontFamily.semibold, lineHeight: 20 },
  /** Input: 15/400 */
  input: { fontSize: 15, fontFamily: fontFamily.regular, lineHeight: 20 },
  /** Parágrafo do onboarding: 15/400 */
  lead: { fontSize: 15, fontFamily: fontFamily.regular, lineHeight: 23 },
  /** Título de item: 14/600 */
  title: { fontSize: 14, fontFamily: fontFamily.semibold, lineHeight: 18 },
  /** Título de card: 14/700 */
  titleBold: { fontSize: 14, fontFamily: fontFamily.bold, lineHeight: 18 },
  /** Valor de item: 14/700 */
  value: { fontSize: 14, fontFamily: fontFamily.bold, lineHeight: 18 },
  /** Botão secundário menor: 14/600 */
  buttonSm: { fontSize: 14, fontFamily: fontFamily.semibold, lineHeight: 18 },
  /** Subtítulo 14/400 */
  subtitle: { fontSize: 14, fontFamily: fontFamily.regular, lineHeight: 20 },
  /** Corpo: 13/400, line-height 1.5–1.6 */
  body: { fontSize: 13, fontFamily: fontFamily.regular, lineHeight: 21 },
  /** Corpo semibold: 13/600 */
  bodySemibold: { fontSize: 13, fontFamily: fontFamily.semibold, lineHeight: 18 },
  /** Corpo medium: 13/500 */
  bodyMedium: { fontSize: 13, fontFamily: fontFamily.medium, lineHeight: 18 },
  /** Corpo bold: 13/700 */
  bodyBold: { fontSize: 13, fontFamily: fontFamily.bold, lineHeight: 18 },
  /** Meta/legenda: 12 */
  meta: { fontSize: 12, fontFamily: fontFamily.regular, lineHeight: 16 },
  /** Meta medium: 12/500 */
  metaMedium: { fontSize: 12, fontFamily: fontFamily.medium, lineHeight: 16 },
  /** Chip / label de ação: 12/600 */
  chip: { fontSize: 12, fontFamily: fontFamily.semibold, lineHeight: 16 },
  /** Botão pequeno bold: 12/700 */
  chipBold: { fontSize: 12, fontFamily: fontFamily.bold, lineHeight: 16 },
  /** Micro: 11 */
  micro: { fontSize: 11, fontFamily: fontFamily.regular, lineHeight: 15 },
  microMedium: { fontSize: 11, fontFamily: fontFamily.medium, lineHeight: 15 },
  microSemibold: { fontSize: 11, fontFamily: fontFamily.semibold, lineHeight: 15 },
  microBold: { fontSize: 11, fontFamily: fontFamily.bold, lineHeight: 15 },
  /** Eyebrow (PERFIL): 11/600 uppercase tracking .1em */
  eyebrow: { fontSize: 11, fontFamily: fontFamily.semibold, lineHeight: 15, letterSpacing: ls(11, 0.1), textTransform: 'uppercase' },
  /** Label de tab: 10/600 */
  tab: { fontSize: 10, fontFamily: fontFamily.semibold, lineHeight: 12 },
} as const satisfies Record<string, TextStyleToken>;

export type TextVariant = keyof typeof textVariants;
