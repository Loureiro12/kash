import { defineConfig } from 'vitest/config';

// Testes de integração contra o Supabase local (`supabase start`). Rodam em série: compartilham o banco.
export default defineConfig({
  test: {
    globals: true,
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/global-setup.ts'],
    setupFiles: ['tests/setup.ts'],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
