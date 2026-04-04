import type { Payload } from 'payload'
import { createUser, createAdminUser } from '../factories/user'
import { withTransaction, type SeedOptions, type SeedResult } from '../shared/types'

export const seedUsers = async (payload: Payload, options: SeedOptions = {}): Promise<SeedResult> => {
  const count = options.count ?? 20
  const force = options.force ?? false
  const startTime = Date.now()

  console.log(`\n👤 Start Seeding: ${count} users...`)

  if (!force) {
    const existingUsers = await payload.find({
      collection: 'users',
      limit: 1,
    })

    if (existingUsers.docs.length > 0) {
      console.log('⚠️  Users already exist. Use --force to reseed.')
      return { collection: 'users', seeded: 0, skipped: existingUsers.totalDocs, failed: 0, duration: 0 }
    }
  }

  if (options.dryRun) {
    console.log(`[DRY RUN] Would seed ${count} users`)
    return { collection: 'users', seeded: 0, skipped: 0, failed: 0, duration: 0 }
  }

  const { success, error } = await withTransaction(
    payload,
    async () => {
      for (let i = 0; i < count; i++) {
        const userNumber = i + 1
        const user = await createUser(payload)

        if (user) {
          console.log(`👤 [${userNumber}/${count}] Created user: ${user.email}`)
        }
      }
    },
    'users',
  )

  const duration = (Date.now() - startTime) / 1000

  if (success) {
    console.log(`\n✨ Finished seeding ${count} users in ${duration.toFixed(2)}s\n`)
    return { collection: 'users', seeded: count, skipped: 0, failed: 0, duration }
  }

  return { collection: 'users', seeded: 0, skipped: 0, failed: count, duration, error }
}

export { createAdminUser }
