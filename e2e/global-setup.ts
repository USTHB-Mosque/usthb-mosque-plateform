import { execFileSync } from 'child_process'
import { E2E_BUCKET, E2E_DATABASE_NAME, E2E_MAILPIT_CONTAINER_NAME, e2eServerEnv } from './lib/env'

// The app webServer prepares the database before building/starting Next.
// Playwright calls globalSetup only after the server is ready. Seed through
// the Local API with the final isolated database, bucket and SMTP settings.
export default async function globalSetup(): Promise<() => void> {
  const serverEnv = e2eServerEnv()

  // Seed with the same isolated DB, storage and local-only SMTP settings as
  // the web server; seeds must never inherit production mail credentials.
  Object.assign(process.env, serverEnv)

  // Imported after the env is final: seed-e2e statically boots @/payload.config.
  const { seedE2e } = await import('@/utils/seed-e2e')
  await seedE2e()

  return () => {
    // Playwright can terminate the docker CLI without stopping its container.
    // Global teardown runs before the webServer processes are released.
    try {
      execFileSync('docker', ['stop', E2E_MAILPIT_CONTAINER_NAME], { stdio: 'ignore' })
    } catch {
      // The container was already stopped (e.g. an interrupted run).
    }
  }
}

// Re-exported so nothing else hardcodes these names.
export { E2E_BUCKET, E2E_DATABASE_NAME }
