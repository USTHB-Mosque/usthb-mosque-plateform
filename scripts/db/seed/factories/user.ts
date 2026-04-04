import type { Payload } from 'payload'
import { fakerAR as faker } from '@faker-js/faker'

export const createUser = async (payload: Payload) => {
  const firstName = faker.person.firstName('male')
  const lastName = faker.person.lastName('male')
  const fullName = `${firstName} ${lastName}`
  const email = faker.internet.email({ firstName, lastName }).toLowerCase()
  const password = 'Test@123456'

  return await payload.create({
    collection: 'users',
    data: {
      email,
      fullName,
      role: 'user',
      password,
    },
  })
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

  return await payload.create({
    collection: 'users',
    data: {
      email: adminEmail,
      fullName: 'مسؤول المنصة',
      role: 'admin',
      password: adminPassword,
    },
  })
}
