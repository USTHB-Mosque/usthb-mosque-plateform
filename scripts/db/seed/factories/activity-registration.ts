import type { Payload } from 'payload'
import { fakerAR as faker } from '@faker-js/faker'

export const createActivityRegistration = async (payload: Payload, activityIds: number[], userIds: number[]) => {
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
      return await payload.create({
        collection: 'activity-registrations',
        data: {
          user: userId,
          activity: activityId,
          attended,
        },
      })
    }

    attempts++
  }

  throw new Error('Could not create unique activity registration after 10 attempts')
}
