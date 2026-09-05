import 'dotenv/config'
import config from '@/payload.config'
import { getPayload } from 'payload'

async function grandfatherUsers() {
  const payload = await getPayload({ config })

  console.log('🔄 Grandfathering existing users...')

  const users = await payload.find({
    collection: 'users',
    where: {
      verificationStatus: { exists: false },
    },
    limit: 1000,
    overrideAccess: true,
  })

  console.log(`Found ${users.totalDocs} users to process`)

  let updated = 0
  for (const user of users.docs) {
    await payload.update({
      collection: 'users',
      id: user.id,
      data: {
        role: 'user',
        verificationStatus: 'verified',
      },
      overrideAccess: true,
    })
    updated++
    console.log(`  ✓ Updated user ${user.email}`)
  }

  console.log(`\n✅ Grandfathering complete: ${updated}/${users.totalDocs} users updated`)
}

grandfatherUsers()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Migration failed:', err)
    process.exit(1)
  })
