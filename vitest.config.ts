import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vitest/config'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': dirname,
    },
  },
  test: {
    globals: false,
    projects: [
      {
        test: {
          name: 'rtl',
          environment: 'jsdom',
          include: ['**/*.test.{ts,tsx}'],
          exclude: ['**/*.unit.test.ts', '**/*.int.test.ts', 'node_modules/**', '.next/**'],
          setupFiles: ['./vitest.setup.ts'],
          globals: false,
        },
      },
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['**/*.unit.test.ts'],
          setupFiles: ['./test/lib/load-env.ts'],
          globals: false,
        },
      },
      {
        test: {
          name: 'integration',
          environment: 'node',
          include: ['**/*.int.test.ts'],
          setupFiles: ['./test/lib/load-env.ts', './test/setup-integration.ts'],
          globalSetup: ['./test/global-setup.ts'],
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 60_000,
          globals: false,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['shared/lib/**', 'features/*/server/**', 'collections/**'],
      thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 },
    },
  },
})
