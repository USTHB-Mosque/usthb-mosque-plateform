import { vercelPostgresAdapter } from '@payloadcms/db-vercel-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'

import { Users } from './collections/Users'
import { Media } from './collections/Media'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const isDev = process.env.NODE_ENV === 'development'

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media],
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL || '',
  cors: [process.env.NEXT_PUBLIC_SERVER_URL || ''],
  csrf: [process.env.NEXT_PUBLIC_SERVER_URL || ''],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },

  db: isDev
    ? postgresAdapter({
        pool: { connectionString: process.env.DATABASE_URI || '' },
        migrationDir: path.resolve(dirname, 'migrations'),
      })
    : vercelPostgresAdapter({
        pool: { connectionString: process.env.POSTGRES_URL || '' },
        migrationDir: path.resolve(dirname, 'migrations'),
      }),
  plugins: [
    ...(isDev
      ? []
      : [
          cloudStoragePlugin({
            collections: {
              [Media.slug]: {
                adapter: vercelBlobAdapter({
                  token: process.env.BLOB_READ_WRITE_TOKEN ?? '',
                  storeId: process.env.BLOB_STORE_ID ?? '',
                }),
                disableLocalStorage: true,
                disablePayloadAccessControl: true,
              },
            },
          }),
        ]),
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
