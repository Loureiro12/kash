import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

/**
 * Preferências dos alertas neste aparelho (como o Face ID): as notificações são calculadas e
 * mostradas aqui, então a escolha também fica aqui. Ligadas por padrão; só aparecem com a
 * permissão de notificações do sistema.
 */
export interface AlertPrefs {
  /** limite do mês (80% e 100%), ritmo e categoria acima do normal */
  spending: boolean;
  /** resumo da semana, domingo às 19h */
  weekly: boolean;
}

const KEY = 'kash.alerts.prefs';
const DEFAULTS: AlertPrefs = { spending: true, weekly: true };

interface AlertPrefsState extends AlertPrefs {
  loaded: boolean;
  load: () => Promise<void>;
  set: (key: keyof AlertPrefs, on: boolean) => void;
}

export const useAlertPrefs = create<AlertPrefsState>((set, get) => ({
  ...DEFAULTS,
  loaded: false,
  load: async () => {
    if (get().loaded) return;
    try {
      const raw = await AsyncStorage.getItem(KEY);
      const saved = raw ? (JSON.parse(raw) as Partial<AlertPrefs>) : {};
      set({ spending: saved.spending ?? DEFAULTS.spending, weekly: saved.weekly ?? DEFAULTS.weekly, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },
  set: (key, on) => {
    set({ [key]: on } as Partial<AlertPrefsState>);
    const { spending, weekly } = get();
    void AsyncStorage.setItem(KEY, JSON.stringify({ spending, weekly })).catch(() => undefined);
  },
}));

/** ids dos alertas já mostrados (por pessoa), para nunca repetir o mesmo aviso */
const sentKey = (userId: string) => `kash.alerts.sent.${userId}`;
/** guarda só os mais recentes: ids são por mês/semana, os antigos não voltam a valer */
const MAX_SENT = 120;

export const sentAlerts = {
  async get(userId: string): Promise<Set<string>> {
    try {
      const raw = await AsyncStorage.getItem(sentKey(userId));
      const list = raw ? (JSON.parse(raw) as unknown) : [];
      return new Set(Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : []);
    } catch {
      return new Set();
    }
  },
  async add(userId: string, ids: string[]): Promise<void> {
    try {
      const current = [...(await sentAlerts.get(userId))];
      const next = [...current.filter((x) => !ids.includes(x)), ...ids].slice(-MAX_SENT);
      await AsyncStorage.setItem(sentKey(userId), JSON.stringify(next));
    } catch {
      // sem storage: no pior caso um aviso se repete
    }
  },
};
