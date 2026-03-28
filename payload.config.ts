import path from 'path'
import { vercelPostgresAdapter } from '@payloadcms/db-vercel-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'

import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { cloudStoragePlugin } from '@payloadcms/plugin-cloud-storage'
import { vercelBlobAdapter } from 'payload-cloud-storage-vercel-adapter'
import {
  Admin,
  User,
  Media,
  Book,
  Activity,
  Article,
  Loan,
  Review,
  ActivityRegistrations,
  BookFavorite,
} from './collections'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Admin.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [
    Admin,
    User,
    Media,
    Book,
    Activity,
    Article,
    Loan,
    Review,
    ActivityRegistrations,
    BookFavorite,
  ],
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL || '',
  cors: [process.env.NEXT_PUBLIC_SERVER_URL || ''],
  csrf: [process.env.NEXT_PUBLIC_SERVER_URL || ''],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },

  db: vercelPostgresAdapter({
    pool: { connectionString: process.env.POSTGRES_URL || '' },
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  plugins: [
    cloudStoragePlugin({
      collections: {
        [Media.slug]: {
          adapter: vercelBlobAdapter({
            token: process.env.BLOB_READ_WRITE_TOKEN || '',
            storeId: process.env.BLOB_STORE_ID || '',
          }),
          disableLocalStorage: true,
          disablePayloadAccessControl: true,
        },
      },
    }),
  ],
  email: nodemailerAdapter({
    defaultFromAddress: process.env.EMAIL_USER || '',
    defaultFromName: process.env.EMAIL_USER || '',
    transportOptions: {
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    },
  }),
})
