import { config } from 'dotenv'

// Tests may run from any cwd; load the project's env files the way Next does:
// `.env.local` wins over `.env`, and neither overrides variables already set
// (so CI can pin TEST_DATABASE_URL from the workflow).
config({ path: '.env.local', override: false })
config({ path: '.env', override: false })

process.env.PAYLOAD_SECRET ||= 'test-secret'
process.env.NEXT_PUBLIC_SERVER_URL ||= 'http://localhost:3000'

// Local runs share the running Postgres but get their own scratch database so
// truncating never touches development data.
if (!process.env.TEST_DATABASE_URL && process.env.DATABASE_URL) {
  const url = new URL(process.env.DATABASE_URL)
  url.pathname = '/mosque_test'
  process.env.TEST_DATABASE_URL = url.toString()
}
