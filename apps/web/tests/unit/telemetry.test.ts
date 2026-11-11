import { beforeEach, describe, expect, it, vi } from 'vitest';

const fb = vi.hoisted(() => ({
  initializeApp: vi.fn(() => ({ name: '[DEFAULT]' })),
  getApps: vi.fn(() => [] as unknown[]),
  getApp: vi.fn(() => ({ name: '[DEFAULT]' })),
  isSupported: vi.fn(async () => true),
  setConsent: vi.fn<(...args: unknown[]) => void>(),
  initializeAnalytics: vi.fn<(...args: unknown[]) => { app: string }>(() => ({ app: '[DEFAULT]' })),
  logEvent: vi.fn(),
  setUserId: vi.fn(),
  getPerformance: vi.fn(),
  order: [] as string[],
}));
vi.mock('firebase/app', () => ({ initializeApp: fb.initializeApp, getApps: fb.getApps, getApp: fb.getApp }));
vi.mock('firebase/analytics', () => ({
  isSupported: fb.isSupported,
  setConsent: (...a: unknown[]) => (fb.order.push('consent'), fb.setConsent(...a)),
  initializeAnalytics: (...a: unknown[]) => (fb.order.push('init'), fb.initializeAnalytics(...a)),
  logEvent: fb.logEvent,
  setUserId: fb.setUserId,
}));
vi.mock('firebase/performance', () => ({ getPerformance: fb.getPerformance }));

/** navegador mínimo: localStorage, eventos e location */
function fakeBrowser(stored: Record<string, string> = {}) {
  const data = new Map(Object.entries(stored));
  const target = new EventTarget();
  vi.stubGlobal('localStorage', { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => data.set(k, v) });
  vi.stubGlobal('window', Object.assign(target, { location: { origin: 'https://www.kash.app.br' } }));
  vi.stubGlobal('document', { title: 'Kash' });
  return data;
}

const FIREBASE_ENV = { NEXT_PUBLIC_FIREBASE_API_KEY: 'k', NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'kash', NEXT_PUBLIC_FIREBASE_APP_ID: '1:2:web:3', NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: 'G-TEST' };

async function load(env: Record<string, string> = FIREBASE_ENV) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  return import('@/lib/telemetry');
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  fb.order.length = 0;
});

describe('telemetria da web (Firebase)', () => {
  it('sem configuração do Firebase não carrega nada', async () => {
    fakeBrowser();
    const t = await load({});
    expect(t.telemetryConfigured()).toBe(false);
    expect(t.initTelemetry()).toBeNull();
    t.track('add_card', {});
    expect(fb.initializeApp).not.toHaveBeenCalled();
  });

  it('antes do aceite: consentimento negado (sem cookies) definido antes de medir e sem Performance', async () => {
    fakeBrowser();
    const t = await load();
    await t.initTelemetry();
    expect(fb.order).toEqual(['consent', 'init']);
    expect(fb.setConsent).toHaveBeenCalledWith({ analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    expect(fb.initializeAnalytics).toHaveBeenCalledWith(expect.anything(), { config: { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false } });
    expect(fb.getPerformance).not.toHaveBeenCalled();
  });

  it('aceitar libera a análise (anúncios continuam negados), liga o Performance e lembra a escolha', async () => {
    const data = fakeBrowser();
    const t = await load();
    await t.initTelemetry();
    t.setConsent('granted');
    await vi.waitFor(() => expect(fb.getPerformance).toHaveBeenCalled());
    expect(fb.setConsent).toHaveBeenLastCalledWith({ analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    expect(data.get(t.CONSENT_KEY)).toBe('granted');
  });

  it('quem já aceitou antes começa com análise e Performance', async () => {
    fakeBrowser({ 'kash-consent': 'granted' });
    const t = await load();
    await t.initTelemetry();
    expect(fb.setConsent).toHaveBeenCalledWith(expect.objectContaining({ analytics_storage: 'granted' }));
    await vi.waitFor(() => expect(fb.getPerformance).toHaveBeenCalled());
  });

  it('eventos, páginas, a pessoa pelo id interno e erros como "exception"', async () => {
    fakeBrowser();
    const t = await load();
    t.track('store_click', { store: 'google_play', placement: 'hero' });
    t.trackPage('/privacidade');
    t.identify('uuid-1');
    t.reportError(new TypeError('x'.repeat(300)));
    await vi.waitFor(() => expect(fb.logEvent).toHaveBeenCalledTimes(3));
    expect(fb.logEvent).toHaveBeenCalledWith(expect.anything(), 'store_click', { store: 'google_play', placement: 'hero' });
    expect(fb.logEvent).toHaveBeenCalledWith(expect.anything(), 'page_view', { page_path: '/privacidade', page_location: 'https://www.kash.app.br/privacidade', page_title: 'Kash' });
    expect(fb.setUserId).toHaveBeenCalledWith(expect.anything(), 'uuid-1');
    const exception = fb.logEvent.mock.calls.find((c) => c[1] === 'exception')![2] as { description: string; fatal: boolean };
    expect(exception.fatal).toBe(true);
    expect(exception.description.startsWith('TypeError: xxx')).toBe(true);
    expect(exception.description.length).toBe(150);
  });
});
