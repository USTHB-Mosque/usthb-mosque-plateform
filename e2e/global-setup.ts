import { execSync } from 'child_process'
import { Client } from 'pg'

import { migrations } from '@/migrations'
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
    // Migrate + verify, retrying on a silent no-op: `payload migrate` has
    // occasionally exited 0 while applying only part of the set while the web
    // server's build runs concurrently. Only the schema check decides whether
    // the step landed — the exit code and output cannot be trusted.
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const output = execSync('node node_modules/payload/bin.js migrate', {
        env: { ...process.env, DATABASE_URL: databaseUrl, NODE_ENV: 'production' },
        encoding: 'utf8',
        timeout: 240_000,
      })
      const tail = output.trim().split('\n').slice(-2).join(' | ')
      console.log(`[e2e] migrate attempt ${attempt}: ${tail || '(no output)'}`)

      const missing = await missingMigrations(databaseUrl)
      if (missing.length === 0) break
      console.log(`[e2e] still missing: ${missing.join(', ')}`)
      if (attempt === 3) {
        throw new Error(
          `payload migrate left ${missing.length} migration(s) unapplied after 3 attempts — aborting`,
        )
      }
    }
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

/**
 * Names of the repo's migrations the database has not applied yet. An empty
 * list is the only trustworthy proof that the schema landed: a row count alone
 * passes even when `payload migrate` applied just the first migration.
 */
async function missingMigrations(databaseUrl: string): Promise<string[]> {
  const client = new Client({ connectionString: databaseUrl })
  await client.connect()
  try {
    const result = await client.query<{ name: string }>('SELECT name FROM "payload_migrations"')
    const applied = new Set(result.rows.map((row) => row.name))
    return migrations.map((migration) => migration.name).filter((name) => !applied.has(name))
  } catch {
    return migrations.map((migration) => migration.name)
  } finally {
    await client.end()
  }
}

// Re-exported so nothing else hardcodes these names.
export { E2E_BUCKET, E2E_DATABASE_NAME }
