/* eslint-disable @typescript-eslint/no-require-imports -- mocks do Jest precisam de require() dentro das factories */

// Reanimated: usa o mock oficial em testes.
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  return { ...Reanimated, Easing: { ...Reanimated.Easing, bezier: () => (t: number) => t, inOut: (f: unknown) => f, out: (f: unknown) => f, ease: (t: number) => t } };
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));

jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { LinearGradient: ({ children, ...props }: { children?: React.ReactNode }) => React.createElement(View, props, children) };
});

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), navigate: jest.fn(), back: jest.fn() }),
  usePathname: () => '/',
}));

// Supabase: o serviço real precisa de módulos nativos; nos testes usamos um cliente falso e mocks da API.
jest.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(async () => ({ data: { session: null } })),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      signOut: jest.fn(async () => ({ error: null })),
    },
  },
}));
jest.mock('@/services/onboarding', () => {
  let seen = false;
  return { onboardingFlag: { get: jest.fn(async () => seen), set: jest.fn(async (v: boolean) => { seen = v; }) } };
});
jest.mock('@kash/supabase-client', () => {
  const actual = jest.requireActual('@kash/supabase-client');
  const mocked: Record<string, unknown> = { ...actual };
  // toda função exportada (minúscula) vira jest.fn; repositórios resolvem undefined por padrão
  for (const key of Object.keys(actual)) {
    if (typeof actual[key] === 'function' && /^[a-z]/.test(key)) mocked[key] = jest.fn(async () => undefined);
  }
  mocked.toKashError = actual.toKashError;
  mocked.getProfile = jest.fn(async () => {
    throw new Error('offline');
  });
  return mocked;
});

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true, status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true, status: 'granted' })),
  setNotificationChannelAsync: jest.fn(async () => null),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => undefined),
  scheduleNotificationAsync: jest.fn(async () => 'id'),
  useLastNotificationResponse: jest.fn(() => null),
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

jest.mock('@/data/queryClient', () => ({
  queryClient: { clear: jest.fn(), refetchQueries: jest.fn(), invalidateQueries: jest.fn(async () => undefined) },
  queryPersister: {},
  QUERY_CACHE_BUSTER: 'test',
}));
