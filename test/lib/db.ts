import { Client } from 'pg'
import type { Payload } from 'payload'

export function testDatabaseUrl(): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL

  const base = process.env.DATABASE_URL
  if (!base) {
    throw new Error(
      'No database for integration tests: set TEST_DATABASE_URL (or DATABASE_URL to derive a scratch database from).',
    )
  }

  // Local runs share the running Postgres (Supabase CLI) but get their own
  // scratch database so truncating never touches development data.
  const url = new URL(base)
  url.pathname = '/mosque_test'
  return url.toString()
}

function adminDatabaseUrl(dbUrl: string): string {
  const url = new URL(dbUrl)
  url.pathname = '/postgres'
  return url.toString()
}

export async function ensureTestDatabase(): Promise<void> {
  const dbUrl = testDatabaseUrl()
  process.env.TEST_DATABASE_URL = dbUrl

  const database = new URL(dbUrl).pathname.slice(1)
  const admin = new Client({ connectionString: adminDatabaseUrl(dbUrl) })
  await admin.connect()
  try {
    const existing = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      database,
    ])
    if (existing.rowCount === 0) {
      await admin.query(`CREATE DATABASE "${database}"`)
    }
  } finally {
    await admin.end()
  }
}

export async function truncateAll(payload: Payload): Promise<void> {
  const { rows } = await payload.db.pool.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables
     WHERE schemaname = 'public' AND tablename NOT LIKE 'payload_migrations%'`,
  )
  if (rows.length === 0) return
  const tables = rows.map((row) => `"${row.tablename}"`).join(', ')
  await payload.db.pool.query(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`)
}
