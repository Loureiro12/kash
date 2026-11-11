// @ts-check
const { existsSync } = require('node:fs');

/**
 * Firebase (Analytics, Crashlytics, Performance) só entra no build quando os arquivos do projeto
 * Firebase existem: no EAS, pelas variáveis de arquivo GOOGLE_SERVICES_PLIST / GOOGLE_SERVICES_JSON;
 * localmente, em `firebase/`. Sem eles o app compila e roda normalmente, sem coleta (ver services/telemetry.ts).
 */
const plist = process.env.GOOGLE_SERVICES_PLIST ?? (existsSync('./firebase/GoogleService-Info.plist') ? './firebase/GoogleService-Info.plist' : undefined);
const json = process.env.GOOGLE_SERVICES_JSON ?? (existsSync('./firebase/google-services.json') ? './firebase/google-services.json' : undefined);

/** @param {import('expo/config').ConfigContext} ctx */
module.exports = ({ config }) => {
  if (!plist || !json) return config;
  return {
    ...config,
    ios: { ...config.ios, googleServicesFile: plist },
    android: { ...config.android, googleServicesFile: json },
    plugins: [
      ...(config.plugins ?? []),
      '@react-native-firebase/app',
      // sem IDFA: não precisa do pedido de rastreamento da Apple (App Tracking Transparency)
      ['@react-native-firebase/analytics', { ios: { withoutAdIdSupport: true } }],
      '@react-native-firebase/crashlytics',
      '@react-native-firebase/perf',
    ],
  };
};
