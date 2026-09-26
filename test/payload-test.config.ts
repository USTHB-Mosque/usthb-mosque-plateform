import path from 'path'
import { fileURLToPath } from 'url'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'

import {
  User,
  Media,
  Book,
  Activity,
  Article,
  Loan,
  Review,
  ActivityRegistrations,
  BookFavorite,
  ArticleFavorite,
  Notification,
  WaitlistEntry,
  LoanExtension,
  Log,
  LibraryCard,
} from '@/collections'
import { Settings } from '@/globals'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Uploads fall back to Payload's local disk storage during tests; keep the
// written files out of the repository working tree.
const testMediaDir = path.resolve(dirname, '.tmp/media')
const mediaUpload = Media.upload as Exclude<typeof Media.upload, boolean>

/**
 * Test boot config: the real collections (so access control and hooks run for
 * real), but pointed at a scratch Postgres database with no S3/Vercel-blob
 * storage and no MCP plugin. Uploads fall back to Payload's local disk
 * storage, which is exactly what the register flow needs to be exercised.
 */
export default buildConfig({
  admin: {
    user: 'users',
  },
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000',
  csrf: [process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'],
  collections: [
    User,
    { ...Media, upload: { ...mediaUpload, staticDir: testMediaDir } },
    Book,
    Activity,
    Article,
    Loan,
    Review,
    ActivityRegistrations,
    BookFavorite,
    ArticleFavorite,
    Notification,
    WaitlistEntry,
    LoanExtension,
    Log,
    LibraryCard,
  ],
  globals: [Settings],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || 'test-secret',
  telemetry: false,
  // Never rewrite payload-types.ts from the test config: it must keep
  // reflecting the real payload.config.ts.
  typescript: { autoGenerate: false },
  db: postgresAdapter({
    pool: { connectionString: process.env.TEST_DATABASE_URL || '' },
    push: false,
    migrationDir: path.resolve(dirname, '../migrations'),
  }),
  plugins: [],
})
