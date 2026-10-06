import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'kash.onboarding.seen';

/** Marca/consulta se o onboarding já foi visto neste aparelho (sem sessão, decide entre onboarding e login). */
export const onboardingFlag = {
  async get(): Promise<boolean> {
    try {
      return (await AsyncStorage.getItem(KEY)) === '1';
    } catch {
      return false;
    }
  },
  async set(seen: boolean) {
    try {
      if (seen) await AsyncStorage.setItem(KEY, '1');
      else await AsyncStorage.removeItem(KEY);
    } catch {
      // storage indisponível: segue sem persistir
    }
  },
};
