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
  return {
    ...actual,
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(async () => undefined),
    requestPasswordReset: jest.fn(),
    deleteOwnAccount: jest.fn(),
    getProfile: jest.fn(async () => {
      throw new Error('offline');
    }),
  };
});

jest.mock('@/data/queryClient', () => ({
  queryClient: { clear: jest.fn(), refetchQueries: jest.fn() },
  queryPersister: {},
  QUERY_CACHE_BUSTER: 'test',
}));
