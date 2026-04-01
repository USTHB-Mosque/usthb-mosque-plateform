import { getPayload } from 'payload'
import config from '@/payload.config'
import { fakerAR as faker } from '@faker-js/faker'

export const createUser = async () => {
  const payload = await getPayload({ config })

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

export const createAdminUser = async () => {
  const payload = await getPayload({ config })

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

export const seedUsers = async (n: number = 10) => {
  console.log(`\n👤 Start Seeding: ${n} users...`)
  const startTime = Date.now()

  const payload = await getPayload({ config })

  const existingUsers = await payload.find({
    collection: 'users',
    limit: 1,
  })

  if (existingUsers.docs.length > 0) {
    console.log('⚠️  Users already exist. Skipping user seeding.')
    return
  }

  for (let i = 0; i < n; i++) {
    const userNumber = i + 1

    try {
      const user = await createUser()

      if (user) {
        console.log(`👤 [${userNumber}/${n}] Created user: ${user.email}`)
      }
    } catch (error) {
      console.error(
        `❌ [${userNumber}/${n}] Error creating user:`,
        error instanceof Error ? error.message : error,
      )
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2)
  console.log(`\n✨ Finished seeding ${n} users in ${duration}s\n`)
}