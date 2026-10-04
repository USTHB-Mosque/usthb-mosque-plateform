import { defineConfig } from '@playwright/test'

import {
  E2E_BASE_URL,
  E2E_DEV,
  E2E_GOOGLE_IDP_URL,
  E2E_MAILPIT_API_URL,
  E2E_SKIP_VISUAL,
  e2eServerEnv,
} from './e2e/lib/env'
import { buildProjects } from './e2e/lib/projects'

const serverEnv = e2eServerEnv()

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  timeout: 45_000,
  forbidOnly: !!process.env.CI,
  retries: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: './e2e/global-setup.ts',
  // Visual baselines are generated under the canonical (production build)
  // run only; disabled animations and hidden carets keep the pixels stable.
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.02,
    },
  },
  use: {
    baseURL: E2E_BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // Canonical run boots a production build against the e2e database; the dev
  // toggle reuses `next dev` for faster authoring (schema push is allowed on
  // the e2e database only).
  webServer: [
    {
      command: 'node e2e/mock/google-idp.mjs',
      url: E2E_GOOGLE_IDP_URL,
      reuseExistingServer: false,
      env: serverEnv,
    },
    {
      command: 'node e2e/mock/mailpit.mjs',
      url: `${E2E_MAILPIT_API_URL}/api/v1/info`,
      reuseExistingServer: false,
    },
    E2E_DEV
      ? {
          command: 'pnpm exec tsx e2e/prepare-db.ts && next dev',
          url: E2E_BASE_URL,
          reuseExistingServer: true,
          timeout: 180_000,
          env: serverEnv,
        }
      : {
          command: 'pnpm exec tsx e2e/prepare-db.ts && pnpm build && next start',
          url: E2E_BASE_URL,
          reuseExistingServer: false,
          // Dropping the database, migrating and the production build all run
          // before the URL answers. CI runners are slower than a dev machine, so
          // the budget is sized for them rather than for a local run.
          timeout: 900_000,
          env: serverEnv,
        },
  ],
  projects: buildProjects({ skipVisual: E2E_SKIP_VISUAL }),
})
