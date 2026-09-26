import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

import './lib/load-env'
import { ensureTestDatabase } from './lib/db'

// Applies the repo's migrations to the scratch database once for the whole
// suite, through the payload CLI (its tsx pipeline handles the generated
// migration files' type imports, which vite's transform cannot erase).
export default async function globalSetup(): Promise<void> {
  await ensureTestDatabase()

  // Uploaded files land in test/.tmp/media via the test config; start clean.
  fs.rmSync(path.resolve('test/.tmp'), { recursive: true, force: true })

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PAYLOAD_CONFIG_PATH: path.resolve('test/payload-test.config.ts'),
  }

  execSync('pnpm exec payload migrate', { env, stdio: 'inherit' })
}
