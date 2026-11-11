import AsyncStorage from '@react-native-async-storage/async-storage';

/** carrega a telemetria com o Firebase "configurado" (getApp responde) */
function loadWithFirebase() {
  jest.resetModules();
  const app = jest.requireMock('@react-native-firebase/app') as { getApp: jest.Mock };
  app.getApp.mockImplementation(() => ({ name: '[DEFAULT]' }));
  return {
    telemetry: jest.requireActual('../telemetry') as typeof import('../telemetry'),
    analytics: jest.requireMock('@react-native-firebase/analytics') as Record<string, jest.Mock>,
    crashlytics: jest.requireMock('@react-native-firebase/crashlytics') as Record<string, jest.Mock>,
    perf: jest.requireMock('@react-native-firebase/perf') as Record<string, jest.Mock>,
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('telemetria (Firebase)', () => {
  it('sem o Firebase no build, nada é chamado', () => {
    jest.resetModules();
    const { track, reportError, isTelemetryAvailable } = jest.requireActual('../telemetry') as typeof import('../telemetry');
    const analytics = jest.requireMock('@react-native-firebase/analytics') as Record<string, jest.Mock>;
    analytics.logEvent!.mockClear();
    track('add_card', {});
    reportError(new Error('x'));
    expect(isTelemetryAvailable()).toBe(false);
    expect(analytics.logEvent).not.toHaveBeenCalled();
  });

  it('eventos, telas, erros e a pessoa pelo id interno', () => {
    const { telemetry, analytics, crashlytics } = loadWithFirebase();
    telemetry.track('add_transaction', { kind: 'expense', source_type: 'card', installments: 3 });
    telemetry.trackScreen('/cards');
    telemetry.identify('uuid-1');
    telemetry.reportError(new Error('falhou'), 'ImportScreen');
    expect(analytics.logEvent).toHaveBeenCalledWith(expect.anything(), 'add_transaction', { kind: 'expense', source_type: 'card', installments: 3 });
    expect(analytics.logScreenView).toHaveBeenCalledWith(expect.anything(), { screen_name: '/cards', screen_class: '/cards' });
    expect(analytics.setUserId).toHaveBeenCalledWith(expect.anything(), 'uuid-1');
    expect(crashlytics.setUserId).toHaveBeenCalledWith(expect.anything(), 'uuid-1');
    expect(crashlytics.log).toHaveBeenCalledWith(expect.anything(), 'ImportScreen');
    expect(crashlytics.recordError).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ message: 'falhou' }));
  });

  it('desligar em Perfil para as três coletas e lembra a escolha', async () => {
    const { telemetry, analytics, crashlytics, perf } = loadWithFirebase();
    await telemetry.setTelemetryEnabled(false);
    expect(analytics.setAnalyticsCollectionEnabled).toHaveBeenCalledWith(expect.anything(), false);
    expect(crashlytics.setCrashlyticsCollectionEnabled).toHaveBeenCalledWith(expect.anything(), false);
    expect(perf.getPerformance!.mock.results.at(-1)!.value.dataCollectionEnabled).toBe(false);
    analytics.logEvent!.mockClear();
    telemetry.track('add_card', {});
    expect(analytics.logEvent).not.toHaveBeenCalled();
    expect(await telemetry.telemetryPreference.get()).toBe(false);
  });

  it('mede as chamadas HTTP sem a query (sem dados na URL)', async () => {
    const { telemetry, perf } = loadWithFirebase();
    const fetcher = telemetry.createMeasuredFetch(async () => new Response('{}', { status: 200, headers: { 'content-type': 'application/json', 'content-length': '2' } }));
    const res = await fetcher('https://x.supabase.co/rest/v1/transactions?select=*&user_id=eq.1', { method: 'get' });
    expect(res.status).toBe(200);
    expect(perf.httpMetric).toHaveBeenCalledWith(expect.anything(), 'https://x.supabase.co/rest/v1/transactions', 'GET');
    const metric = perf.httpMetric!.mock.results.at(-1)!.value;
    expect(metric.setHttpResponseCode).toHaveBeenCalledWith(200);
    expect(metric.stop).toHaveBeenCalled();
  });
});
