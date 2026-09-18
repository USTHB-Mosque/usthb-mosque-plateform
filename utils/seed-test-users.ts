'use server'
import config from '@/payload.config'
import { getPayload } from 'payload'

const createTestUser = async () => {
  const payload = await getPayload({ config })
  
  const testUsers = [
    { email: 'test1@mosque.dz', password: 'Test@123456', fullName: 'مستخدم اختبار 1', role: 'user' as const },
    { email: 'test2@mosque.dz', password: 'Test@123456', fullName: 'مستخدم اختبار 2', role: 'user' as const },
    { email: 'test3@mosque.dz', password: 'Test@123456', fullName: 'مستخدم اختبار 3', role: 'user' as const },
  ]

  for (const userData of testUsers) {
    try {
      const existing = await payload.find({
        collection: 'users',
        where: { email: { equals: userData.email } },
        limit: 1,
      })

      if (existing.docs.length > 0) {
        console.log(`User ${userData.email} already exists`)
        continue
      }

      const user = await payload.create({
        collection: 'users',
        data: userData,
        draft: true,
      })

      console.log(`Created user: ${user.email}`)
    } catch (error) {
      console.error(`Error creating user ${userData.email}:`, error)
    }
  }
}

createTestUser()
  .then(() => console.log('Done'))
  .catch(console.error)