import type { TelemetryEventName, TelemetryEvents } from '@kash/domain';
import { getApp } from '@react-native-firebase/app';
import { getAnalytics, logEvent, logScreenView, setAnalyticsCollectionEnabled, setUserId } from '@react-native-firebase/analytics';
import { getCrashlytics, log as crashLog, recordError, setCrashlyticsCollectionEnabled, setUserId as setCrashUserId } from '@react-native-firebase/crashlytics';
import { getPerformance, httpMetric, trace } from '@react-native-firebase/perf';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Firebase Analytics, Crashlytics e Performance. Tudo é no-op quando o build não tem o Firebase
 * (sem GoogleService-Info.plist/google-services.json: dev local, testes) ou quando a pessoa desligou
 * "Compartilhar dados de uso" em Perfil. Nada de valores, nomes de lançamentos ou e-mail.
 */

const PREF_KEY = 'kash.telemetry.enabled';
let enabled = true;

/** o build tem o Firebase configurado? */
function firebaseReady(): boolean {
  try {
    getApp();
    return true;
  } catch {
    return false;
  }
}
const ready = firebaseReady();

const safe = <T,>(fn: () => T): T | undefined => {
  if (!ready) return undefined;
  try {
    return fn();
  } catch {
    return undefined;
  }
};

/** Preferência guardada no aparelho (padrão: ligada). */
export const telemetryPreference = {
  async get(): Promise<boolean> {
    try {
      return (await AsyncStorage.getItem(PREF_KEY)) !== '0';
    } catch {
      return true;
    }
  },
  async set(on: boolean) {
    try {
      await AsyncStorage.setItem(PREF_KEY, on ? '1' : '0');
    } catch {
      // sem armazenamento: vale só nesta sessão
    }
  },
};

/** Liga/desliga as três coletas de uma vez (e guarda a escolha). */
export async function setTelemetryEnabled(on: boolean, persist = true) {
  enabled = on;
  if (persist) await telemetryPreference.set(on);
  safe(() => {
    void setAnalyticsCollectionEnabled(getAnalytics(), on);
    void setCrashlyticsCollectionEnabled(getCrashlytics(), on);
    getPerformance().dataCollectionEnabled = on;
  });
}

/** No início do app: aplica a preferência guardada. */
export async function initTelemetry() {
  await setTelemetryEnabled(await telemetryPreference.get(), false);
}

export function isTelemetryAvailable() {
  return ready;
}

export function track<N extends TelemetryEventName>(name: N, params: TelemetryEvents[N]) {
  if (!enabled) return;
  safe(() => void logEvent(getAnalytics(), name as string, params as Record<string, unknown>));
}

export function trackScreen(screen: string) {
  if (!enabled) return;
  safe(() => void logScreenView(getAnalytics(), { screen_name: screen, screen_class: screen }));
}

/** id interno do Supabase (pseudônimo); null ao sair */
export function identify(userId: string | null) {
  safe(() => {
    void setUserId(getAnalytics(), userId);
    void setCrashUserId(getCrashlytics(), userId ?? '');
  });
}

/** Erro tratado que vale investigar (o app seguiu de pé). */
export function reportError(error: unknown, context?: string) {
  if (!enabled) return;
  safe(() => {
    if (context) crashLog(getCrashlytics(), context);
    recordError(getCrashlytics(), error instanceof Error ? error : new Error(String(error)));
  });
}

/** Mede um trecho (ex.: carregar os dados, ler um PDF) como trace do Performance. */
export async function measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const t = enabled ? safe(() => trace(getPerformance(), name)) : undefined;
  await Promise.resolve(t?.start()).catch(() => undefined);
  try {
    return await fn();
  } finally {
    await Promise.resolve(t?.stop()).catch(() => undefined);
  }
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'CONNECT' | 'TRACE';

/** fetch que mede cada chamada HTTP (Supabase) no Performance: URL sem query, método, status e tamanho. */
export function createMeasuredFetch(base: typeof fetch = fetch): typeof fetch {
  return async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase() as HttpMethod;
    const metric = enabled ? safe(() => httpMetric(getPerformance(), url.split('?')[0]!, method)) : undefined;
    await Promise.resolve(metric?.start()).catch(() => undefined);
    try {
      const res = await base(input, init);
      metric?.setHttpResponseCode(res.status);
      const size = Number(res.headers.get('content-length'));
      if (Number.isFinite(size) && size > 0) metric?.setResponsePayloadSize(size);
      metric?.setResponseContentType(res.headers.get('content-type'));
      return res;
    } finally {
      await Promise.resolve(metric?.stop()).catch(() => undefined);
    }
  };
}
