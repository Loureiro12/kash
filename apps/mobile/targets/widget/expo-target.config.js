// @ts-check
/**
 * Widget do Kash (WidgetKit): tela inicial (pequeno e médio) e tela bloqueada. Abre o Assistente
 * Kash ou o lançamento de gasto por link (com.andreloureiro.kash://assistant | ://lancar).
 * Gerado no prebuild pelo @bacons/apple-targets — não editar em ios/.
 * Cores = tokens do design system (src/design-system/tokens/colors.ts): accent, bg/surface, text, muted e ink.
 * @type {import('@bacons/apple-targets/app.plugin').Config}
 */
module.exports = {
  type: 'widget',
  name: 'KashWidget',
  displayName: 'Kash',
  bundleIdentifier: '.widget',
  // containerBackground e widgets da tela bloqueada com o visual novo: iOS 17+
  deploymentTarget: '17.0',
  frameworks: ['SwiftUI', 'WidgetKit'],
  colors: {
    $accent: '#C6F432',
    $widgetBackground: { color: '#FFFFFF', darkColor: '#16181C' },
    kashText: { color: '#14161A', darkColor: '#F3F4F0' },
    kashMuted: { color: '#6B7079', darkColor: '#8B9099' },
    kashInk: '#0B0C0E',
    kashAccent: '#C6F432',
    kashBackground: { color: '#FFFFFF', darkColor: '#16181C' },
  },
};
