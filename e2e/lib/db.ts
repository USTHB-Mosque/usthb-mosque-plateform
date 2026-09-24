import { Client } from 'pg'

// Creates the dedicated e2e database on the running local Supabase Postgres if
// it does not exist yet — same pattern as test/lib/db.ts does for mosque_test.
export async function ensureE2eDatabase(databaseUrl: string): Promise<void> {
  const adminUrl = new URL(databaseUrl)
  adminUrl.pathname = '/postgres'

  const admin = new Client({ connectionString: adminUrl.toString() })
  await admin.connect()
  try {
    const database = new URL(databaseUrl).pathname.slice(1)
    const existing = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [database])
    if (existing.rowCount === 0) {
      await admin.query(`CREATE DATABASE "${database}"`)
    }
  } finally {
    await admin.end()
  }
}
