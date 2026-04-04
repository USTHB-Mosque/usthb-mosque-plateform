import type { Payload } from 'payload'
import { fakerAR as faker } from '@faker-js/faker'
import type { SeedOptions, SeedResult } from '../seed-config'
import { withTransaction } from './with-transaction'

export const createUser = async (payload: Payload) => {
  const firstName = faker.person.firstName('male')
  const lastName = faker.person.lastName('male')
  const fullName = `${firstName} ${lastName}`
  const email = faker.internet.email({ firstName, lastName }).toLowerCase()
  const password = 'Test@123456'

  const user = await payload.create({
    collection: 'users',
    data: {
      email,
      fullName,
      role: 'user',
      password,
    },
  })

  return user
}

export const createAdminUser = async (payload: Payload) => {
  const adminEmail = 'admin@mosque.dz'
  const adminPassword = 'Admin@123456'

  const existing = await payload.find({
    collection: 'users',
    where: { email: { equals: adminEmail } },
    limit: 1,
  })

  if (existing.docs.length > 0) {
    console.log('Admin user already exists')
    return existing.docs[0]
  }

  const admin = await payload.create({
    collection: 'users',
    data: {
      email: adminEmail,
      fullName: 'مسؤول المنصة',
      role: 'admin',
      password: adminPassword,
    },
  })

  return admin
}

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
      let seeded = 0

      for (let i = 0; i < count; i++) {
        const userNumber = i + 1
        const user = await createUser(payload)

        if (user) {
          console.log(`👤 [${userNumber}/${count}] Created user: ${user.email}`)
          seeded++
        }
      }

      return seeded
    },
    'users',
  )

  const duration = (Date.now() - startTime) / 1000

  if (success && typeof error === 'undefined') {
    console.log(`\n✨ Finished seeding ${count} users in ${duration.toFixed(2)}s\n`)
    return { collection: 'users', seeded: count, skipped: 0, failed: 0, duration }
  }

  return { collection: 'users', seeded: 0, skipped: 0, failed: count, duration, error }
}
