import { defineConfig, devices } from '@playwright/test'

import { E2E_BASE_URL, E2E_DEV, e2eServerEnv } from './e2e/lib/env'

const serverEnv = e2eServerEnv()

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  timeout: 45_000,
  forbidOnly: !!process.env.CI,
  retries: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: E2E_BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // Canonical run boots a production build against the e2e database; the dev
  // toggle reuses `next dev` for faster authoring (schema push is allowed on
  // the e2e database only).
  webServer: E2E_DEV
    ? {
        command: 'next dev',
        url: E2E_BASE_URL,
        reuseExistingServer: true,
        timeout: 180_000,
        env: serverEnv,
      }
    : {
        command: 'pnpm build && next start',
        url: E2E_BASE_URL,
        reuseExistingServer: false,
        timeout: 600_000,
        env: serverEnv,
      },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium',
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'webkit',
      testMatch: /core\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Safari'] },
    },
  ],
})
