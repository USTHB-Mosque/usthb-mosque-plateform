import { getPayload } from 'payload'

import config from '@/payload.config'

import { ensureStorageBucket } from './seed/ensure-bucket'
import { createAdminUser } from './seed/users'
import { seedMedias } from './seed/media'
import { seedBooks } from './seed/book'
import { seedActivities } from './seed/activities'
import { seedArticles } from './seed/articles'
import { seedLoans } from './seed/loans'
import { E2E_GOOGLE_EMAIL, E2E_MEMBER_EMAIL, E2E_MEMBER_PASSWORD } from '@/e2e/lib/test-users'
import type { Payload } from 'payload'

// The lean e2e seed: deterministic identities + the fixed seed content set,
// truncated and rebuilt from scratch every run. Administrative Local API calls
// without `user` are an intentional bypass (AGENTS.md).
export async function seedE2e(): Promise<void> {
  console.log('🪣 Ensuring the e2e storage bucket...')
  await ensureStorageBucket()

  const payload = await getPayload({ config })

  console.log('🧹 Truncating the e2e database...')
  const { rows } = await payload.db.pool.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables
     WHERE schemaname = 'public' AND tablename NOT LIKE 'payload_migrations%'`,
  )
  if (rows.length > 0) {
    const tables = rows.map((row) => `"${row.tablename}"`).join(', ')
    await payload.db.pool.query(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`)
  }

  console.log('👤 Creating the admin user...')
  await createAdminUser()

  console.log('👤 Creating e2e members...')
  const members: {
    email: string
    fullName: string
    verificationStatus: 'verified' | 'pending_verification'
  }[] = [
    { email: E2E_MEMBER_EMAIL, fullName: 'العضو الأول', verificationStatus: 'verified' },
    {
      email: 'member2@e2e.mosque',
      fullName: 'العضو الثاني',
      verificationStatus: 'pending_verification',
    },
    { email: E2E_GOOGLE_EMAIL, fullName: 'عضو جوجل', verificationStatus: 'verified' },
  ]
  for (const member of members) {
    await payload.create({
      collection: 'users',
      data: {
        email: member.email,
        fullName: member.fullName,
        role: 'user',
        password: E2E_MEMBER_PASSWORD,
        verificationStatus: member.verificationStatus,
      },
    })
  }

  console.log('📷 Seeding medias (2)...')
  await seedMedias(2)

  console.log('📚 Seeding books...')
  await seedBooks()

  console.log('🎉 Seeding activities...')
  await seedActivities()

  console.log('📰 Seeding articles...')
  await seedArticles()

  console.log('📋 Seeding loans (5)...')
  await seedLoans(5)

  console.log('✅ E2E seed complete')
  await closePayload(payload)
}

// Payload's pool keeps the Node process alive; release it once seeding is done.
async function closePayload(payload: Payload): Promise<void> {
  if ('destroy' in payload.db && typeof payload.db.destroy === 'function') {
    await payload.db.destroy()
  }
}
