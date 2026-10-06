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
