import path from 'path'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'

import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { getStoragePlugin } from './storage'
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
} from './collections'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: 'users',
    importMap: {
      baseDir: path.resolve(dirname),
    },
    routes: {
      login: '/login',
      createFirstUser: '/first-user',
      account: '/account',
    },
    components: {
      views: {
        login: { Component: '@/features/admin/components/login/Login' },
        firstUser: { Component: '@/features/admin/components/first-user/FirstUser' },
        account: { Component: '@/features/admin/components/account/Account' },
      },
    },
  },
  collections: [
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

  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL || '' },
    migrationDir: path.resolve(dirname, 'migrations'),
  }),

  plugins: [getStoragePlugin()],

  email: nodemailerAdapter({
    defaultFromAddress: process.env.EMAIL_USER || 'noreply@localhost',
    defaultFromName: process.env.EMAIL_USER || 'USTHB Mosque',
    transportOptions: {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '465'),
      secure: process.env.EMAIL_PORT === '465',
      auth:
        process.env.EMAIL_USER && process.env.EMAIL_PASSWORD
          ? {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASSWORD,
            }
          : undefined,
    },
  }),
})
