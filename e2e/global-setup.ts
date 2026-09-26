import { execSync } from 'child_process'

import { E2E_BUCKET, E2E_DATABASE_NAME, E2E_DEV, e2eDatabaseUrl } from './lib/env'
import { ensureE2eDatabase } from './lib/db'

// Orchestrates the whole e2e data plane:
// 1. ensure the dedicated `mosque_e2e` database exists (never dev data),
// 2. canonical mode: apply the repo's migrations via the payload CLI — the
//    schema source of truth (AGENTS.md: trust migrations, not push); dev mode:
//    let Payload's push manage the e2e schema,
// 3. truncate + lean-seed through the Local API with the final env, so
//    `payload.config` is evaluated with the e2e DATABASE_URL and S3_BUCKET.
export default async function globalSetup(): Promise<void> {
  const databaseUrl = e2eDatabaseUrl()

  // Canonical mode migrates from a clean slate — a leftover dev-mode schema
  // push would otherwise block the migration on an interactive prompt.
  await ensureE2eDatabase(databaseUrl, { dropExisting: !E2E_DEV })

  if (!E2E_DEV) {
    execSync('pnpm exec payload migrate', {
      env: { ...process.env, DATABASE_URL: databaseUrl, NODE_ENV: 'production' },
      stdio: 'inherit',
    })
  }

  // Next's ambient types mark NODE_ENV readonly; this process is not Next's.
  const processEnv = process.env as { NODE_ENV?: string }
  processEnv.NODE_ENV = E2E_DEV ? 'development' : 'production'

  process.env.DATABASE_URL = databaseUrl
  process.env.S3_BUCKET = E2E_BUCKET

  // Imported after the env is final: seed-e2e statically boots @/payload.config.
  const { seedE2e } = await import('@/utils/seed-e2e')
  await seedE2e()
}

// Re-exported so nothing else hardcodes these names.
export { E2E_BUCKET, E2E_DATABASE_NAME }
