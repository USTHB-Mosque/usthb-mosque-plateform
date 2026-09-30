import { Client } from 'pg'

// Creates the dedicated e2e database on the running local compose Postgres —
// same pattern as test/lib/db.ts does for mosque_test. The webServer preparation
// drops any existing e2e database in canonical mode: migrations start clean
// (a dev-mode push leaves a `batch = -1` marker that makes `payload migrate`
// block on an interactive data-loss prompt).
export async function ensureE2eDatabase(
  databaseUrl: string,
  { dropExisting = false }: { dropExisting?: boolean } = {},
): Promise<void> {
  const adminUrl = new URL(databaseUrl)
  adminUrl.pathname = '/postgres'

  const admin = new Client({ connectionString: adminUrl.toString() })
  await admin.connect()
  try {
    const database = new URL(databaseUrl).pathname.slice(1)
    if (dropExisting) {
      // WITH (FORCE) disconnects leftover pool connections from previous runs.
      await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`)
    }
    const existing = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [database])
    if (existing.rowCount === 0) {
      await admin.query(`CREATE DATABASE "${database}"`)
    }
  } finally {
    await admin.end()
  }
}
