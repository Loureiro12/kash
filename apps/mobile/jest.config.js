/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  // Reanimated 4 / worklets: resolve as versões não-nativas em testes
  resolver: 'react-native-worklets/jest/resolver.js',
  roots: ['<rootDir>/src', '<rootDir>/app'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@kash/domain$': '<rootDir>/../../packages/domain/src',
    '^@kash/supabase-client$': '<rootDir>/../../packages/supabase-client/src',
    // lucide publica ESM (.mjs) como entrada principal; em testes usamos o build CJS
    // lucide publica ESM como entrada; require.resolve usa a condição "require" e cai no build CJS
    '^lucide-react-native$': require.resolve('lucide-react-native'),
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation|lucide-react-native))',
    '/node_modules/react-native-reanimated/plugin/',
    '/node_modules/@react-native/babel-preset/',
  ],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/test/**', '!src/**/*.d.ts'],
};
