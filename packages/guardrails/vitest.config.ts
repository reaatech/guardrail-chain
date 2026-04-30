import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

const root = new URL('..', import.meta.url).pathname;

export default defineConfig({
  resolve: {
    alias: {
      '@reaatech/guardrail-chain': resolve(root, 'guardrail-chain/src/index.ts'),
      '@reaatech/guardrail-chain-observability': resolve(root, 'observability/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['**/*.d.ts', 'dist/**', '**/*.config.*'],
      thresholds: {
        global: {
          branches: 90,
          functions: 95,
          lines: 95,
          statements: 95,
        },
      },
    },
    testTimeout: 10000,
    hookTimeout: 5000,
  },
});
