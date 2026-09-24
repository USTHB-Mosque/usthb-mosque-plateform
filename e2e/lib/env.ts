import fs from 'fs'
import path from 'path'

import dotenv from 'dotenv'

// Mirror Next.js precedence: .env.local wins over .env; real exports win over both.
const load = (file: string) => {
  const full = path.resolve(process.cwd(), file)
  if (fs.existsSync(full)) dotenv.config({ path: full })
}

load('.env.local')
load('.env')

// The e2e-only database name inside the running local Supabase Postgres —
// never the development `postgres` database, never the vitest `mosque_test`.
export const E2E_DATABASE_NAME = 'mosque_e2e'

// Dedicated bucket so e2e uploads never pollute the development `media` bucket.
export const E2E_BUCKET = 'media-e2e'

export const E2E_PORT = Number(process.env.E2E_PORT ?? 3100)

export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`

// Authoring mode: run the suite against `next dev` (schema push allowed on the
// e2e database). Canonical mode (default): migrate + build + start.
export const E2E_DEV = process.env.E2E_DEV === '1'

export function e2eDatabaseUrl(): string {
  const base = process.env.DATABASE_URL
  if (!base) {
    throw new Error('No DATABASE_URL found (.env/.env.local) — cannot derive the e2e database URL.')
  }
  const url = new URL(base)
  url.pathname = `/${E2E_DATABASE_NAME}`
  return url.toString()
}

export function e2eServerEnv(): Record<string, string> {
  const env: Record<string, string> = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) env[key] = value
  }
  env.DATABASE_URL = e2eDatabaseUrl()
  env.S3_BUCKET = E2E_BUCKET
  // NEXT_PUBLIC_* values are inlined into the client bundle at build time —
  // the stale localhost:3000 from .env.local would send browser fetches to a
  // dead port, so both public URLs point at the e2e server.
  env.NEXT_PUBLIC_SERVER_URL = E2E_BASE_URL
  env.NEXT_PUBLIC_API_URL = E2E_BASE_URL
  env.PORT = String(E2E_PORT)
  // .env/.env.local set NODE_ENV=development for `pnpm dev`; never leak it into
  // a `next build` (dev-mode React breaks static prerendering).
  env.NODE_ENV = E2E_DEV ? 'development' : 'production'
  return env
}
