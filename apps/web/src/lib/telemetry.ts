'use client';

import type { TelemetryEventName, TelemetryEvents } from '@kash/domain';
import type { Analytics } from 'firebase/analytics';

/**
 * Google Analytics for Firebase e Firebase Performance no site e no Kash web.
 * - Sem as variáveis NEXT_PUBLIC_FIREBASE_* (local, CI) tudo é no-op.
 * - Consentimento (LGPD): até a pessoa aceitar no banner, o Analytics roda no modo de consentimento
 *   negado (sem cookies, só sinais agregados) e o Performance nem carrega. Recusar mantém assim.
 * - Erros não tratados viram o evento `exception` (Crashlytics não existe para web).
 * Eventos nunca levam valores, nomes de lançamentos ou e-mail (ver TelemetryEvents).
 */

export type Consent = 'granted' | 'denied';
export const CONSENT_KEY = 'kash-consent';
export const CONSENT_EVENT = 'kash:consent';

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
};
export const telemetryConfigured = () => !!(config.apiKey && config.projectId && config.appId && config.measurementId);

/** escolha guardada no navegador; null = ainda não respondeu o banner */
export function readConsent(): Consent | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
}

let analytics: Promise<{ a: Analytics; mod: typeof import('firebase/analytics') } | null> | null = null;
let perfStarted = false;

function consentState(granted: boolean) {
  // anúncios nunca: só a medição de uso depende do aceite
  return { analytics_storage: granted ? 'granted' : 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' } as const;
}

async function startPerformance() {
  if (perfStarted) return;
  perfStarted = true;
  const [{ getApp }, { getPerformance }] = await Promise.all([import('firebase/app'), import('firebase/performance')]);
  getPerformance(getApp());
}

/** Inicializa (uma vez) com a escolha atual. Chamado pelo TelemetryProvider. */
export function initTelemetry() {
  if (analytics || typeof window === 'undefined' || !telemetryConfigured()) return analytics;
  analytics = (async () => {
    const [{ initializeApp, getApps }, mod] = await Promise.all([import('firebase/app'), import('firebase/analytics')]);
    if (!(await mod.isSupported())) return null;
    const app = getApps()[0] ?? initializeApp(config);
    const granted = readConsent() === 'granted';
    // o consentimento padrão vale antes da primeira medição
    mod.setConsent(consentState(granted));
    const a = mod.initializeAnalytics(app, { config: { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false } });
    if (granted) void startPerformance();
    return { a, mod };
  })().catch(() => null);
  return analytics;
}

/** Resposta do banner (ou mudança nas preferências de cookies). */
export function setConsent(choice: Consent) {
  try {
    localStorage.setItem(CONSENT_KEY, choice);
  } catch {
    // sem armazenamento: o banner volta na próxima visita
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: choice }));
  void initTelemetry()?.then((ga) => {
    ga?.mod.setConsent(consentState(choice === 'granted'));
    if (choice === 'granted') void startPerformance();
  });
}

export function track<N extends TelemetryEventName>(name: N, params: TelemetryEvents[N]) {
  void initTelemetry()?.then((ga) => ga?.mod.logEvent(ga.a, name as string, params as Record<string, unknown>));
}

export function trackPage(path: string) {
  void initTelemetry()?.then((ga) => ga?.mod.logEvent(ga.a, 'page_view', { page_path: path, page_location: window.location.origin + path, page_title: document.title }));
}

/** id interno do Supabase (pseudônimo); null ao sair */
export function identify(userId: string | null) {
  void initTelemetry()?.then((ga) => ga?.mod.setUserId(ga.a, userId));
}

/** Erro sem tratamento: evento `exception` com a mensagem curta (sem dados da pessoa). */
export function reportError(error: unknown, fatal = true) {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  void initTelemetry()?.then((ga) => ga?.mod.logEvent(ga.a, 'exception', { description: message.slice(0, 150), fatal }));
}
