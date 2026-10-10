import Constants from 'expo-constants';

/** Versão do app (app.json › expo.version), a mesma que aparece nas lojas. */
export const APP_VERSION: string = Constants.expoConfig?.version ?? '';
