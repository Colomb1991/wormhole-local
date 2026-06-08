import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'packages/**/tests/**/*.{test,spec}.{ts,tsx}',
      'packages/**/src/**/*.{test,spec}.{ts,tsx}',
      'tests/unit/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: ['**/node_modules/**', '**/.next/**', '**/dist/**', 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      exclude: [
        '**/node_modules/**',
        '**/.next/**',
        '**/dist/**',
        '**/migrations/**',
        '**/*.config.*',
        '**/tests/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@wormhole/database': resolve(__dirname, './packages/database/src/index.ts'),
      '@wormhole/shared': resolve(__dirname, './packages/shared/src/index.ts'),
      '@wormhole/ui': resolve(__dirname, './packages/ui/src/index.ts'),
      '@wormhole/core': resolve(__dirname, './packages/core/src/index.ts'),
    },
  },
})
