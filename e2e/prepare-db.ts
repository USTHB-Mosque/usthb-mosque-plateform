import { execSync } from 'node:child_process'

import { Client } from 'pg'

import { migrations } from '@/migrations'
import { ensureE2eDatabase } from './lib/db'
import { E2E_DEV, e2eServerEnv } from './lib/env'

const serverEnv = e2eServerEnv()
const databaseUrl = serverEnv.DATABASE_URL

// Playwright starts webServer commands before globalSetup. Prepare the database
// here so the production build never queries a database that does not exist.
await ensureE2eDatabase(databaseUrl, { dropExisting: !E2E_DEV })

if (!E2E_DEV) {
  // Only the schema check decides whether a migration landed: the CLI has
  // occasionally returned success after applying just part of the set.
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const output = execSync('node node_modules/payload/bin.js migrate', {
      env: { ...serverEnv, NODE_ENV: 'production' },
      encoding: 'utf8',
      timeout: 240_000,
    })
    const lastLines = output.trim().split('\n').slice(-2).join(' | ')
    console.log(`[e2e] migrate attempt ${attempt}: ${lastLines || '(no output)'}`)

    const missing = await missingMigrations(databaseUrl)
    if (missing.length === 0) break
    console.log(`[e2e] still missing: ${missing.join(', ')}`)
    if (attempt === 3) {
      throw new Error(
        `payload migrate left ${missing.length} migration(s) unapplied after 3 attempts`,
      )
    }
  }
}

async function missingMigrations(url: string): Promise<string[]> {
  const client = new Client({ connectionString: url })
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
