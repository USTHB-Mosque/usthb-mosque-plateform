import { getPayload } from 'payload'
import config from '@/payload.config'
import { fakerAR as faker } from '@faker-js/faker'

export const createActivityRegistration = async (activityIds: number[], userIds: number[]) => {
  const payload = await getPayload({ config })

  let attempts = 0
  while (attempts < 10) {
    const userId = faker.helpers.arrayElement(userIds)
    const activityId = faker.helpers.arrayElement(activityIds)
    const attended = faker.datatype.boolean(0.7)

    const existingReg = await payload.find({
      collection: 'activity-registrations',
      where: {
        and: [{ user: { equals: userId } }, { activity: { equals: activityId } }],
      },
      limit: 1,
    })

    if (existingReg.totalDocs === 0) {
      const registration = await payload.create({
        collection: 'activity-registrations',
        data: {
          user: userId,
          activity: activityId,
          attended,
        },
      })

      return registration
    }

    attempts++
  }

  throw new Error('Could not create unique activity registration after 10 attempts')
}

export const seedActivityRegistrations = async (n: number = 10) => {
  console.log(`\n🎯 Start Seeding: ${n} activity registrations...`)
  const startTime = Date.now()

  const payload = await getPayload({ config })

  const activities = await payload.find({
    collection: 'activities',
    limit: 1000,
  })

  const users = await payload.find({
    collection: 'users',
    limit: 1000,
  })

  const activityIds = activities.docs.map((activity) => activity.id)
  const userIds = users.docs.map((user) => user.id)

  if (activityIds.length === 0 || userIds.length === 0) {
    console.warn('⚠️  No activities or users found. Skipping activity registration seeding.')
    return
  }

  for (let i = 0; i < n; i++) {
    const regNumber = i + 1

    try {
      const registration = await createActivityRegistration(activityIds, userIds)

      if (registration) {
        const attendedStatus = registration.attended ? '✓' : '✗'
        console.log(
          `🎯 [${regNumber}/${n}] Created registration: #${registration.id} (Attended: ${attendedStatus})`,
        )
      } else {
        console.warn(`⚠️  [${regNumber}/${n}] Registration creation returned null.`)
      }
    } catch (error) {
      console.error(
        `❌ [${regNumber}/${n}] Error creating registration:`,
        error instanceof Error ? error.message : error,
      )
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2)
  console.log(`\n✨ Finished seeding ${n} activity registrations in ${duration}s\n`)
}
