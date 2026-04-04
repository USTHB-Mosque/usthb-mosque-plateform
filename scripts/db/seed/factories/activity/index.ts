import type { Payload } from 'payload'
import { fakerAR as faker } from '@faker-js/faker'
import { Activity } from '@/payload-types'
import { generateLexicalRichText } from '../../shared/rich-text'
import { authors } from './data'

const types: Activity['type'][] = [
  'aqidah',
  'fiqh',
  'hadith',
  'tafsir',
  'sirah',
  'language',
  'other',
]

export const createActivity = async (payload: Payload, mediaIds: number[]) => {
  const maxParticipants = faker.number.int({ min: 10, max: 100 })
  const currentParticipants = faker.number.int({ min: 0, max: maxParticipants })

  const registrationDeadline = faker.date.future().toISOString()
  const startDate = faker.date.future({ refDate: registrationDeadline }).toISOString()

  return await payload.create({
    collection: 'activities',
    data: {
      title: faker.lorem.words(3),
      type: faker.helpers.arrayElement(types),
      image: faker.helpers.arrayElement(mediaIds),
      shortDescription: faker.lorem.words(6),
      longDescription: generateLexicalRichText() as any,
      targetAudience: Array(Math.floor(Math.random() * 4) + 1).fill({ name: faker.lorem.words(2) }),
      location: faker.location.city(),
      benefits: Array(Math.floor(Math.random() * 4) + 1).fill({ name: faker.lorem.words(2) }),
      supervisor: faker.helpers.arrayElement(authors),
      schedules: Array(Math.floor(Math.random() * 4) + 1).fill({
        dateAndTime: faker.date.future().toISOString(),
      }),
      openForRegistration: faker.datatype.boolean(),
      registrationDeadline,
      startDate,
      maxParticipants,
      currentParticipants,
    },
  })
}
