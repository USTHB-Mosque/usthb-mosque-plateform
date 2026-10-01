import 'dotenv/config'

import { ensureStorageBucket } from './seed/ensure-bucket'

// Standalone entry point so the deploy path can create the media bucket before
// the app starts (RustFS ships no `mc` client, and Payload never creates
// buckets). Safe to run repeatedly.
ensureStorageBucket().catch((error) => {
  console.error('❌ Could not prepare the media bucket:', error)
  process.exit(1)
})
