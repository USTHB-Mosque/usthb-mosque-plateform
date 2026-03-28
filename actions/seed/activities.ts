import { getPayload } from 'payload'
import config from '@/payload.config'
import { fakerAR as faker } from '@faker-js/faker'
import { Activity } from '@/payload-types'
import { generateLexicalRichText } from './utils'

const authors = [
  'الشيخ محمد بن صالح العثيمين',
  'الشيخ عبد العزيز بن عبد الله بن باز',
  'الشيخ محمد ناصر الدين الألباني',
  'الشيخ محمد بن إبراهيم آل الشيخ',
  'الشيخ عبد الرحمن بن ناصر السعدي',
  'الشيخ محمد بن صالح المنجد',
  'الشيخ محمد بن صالح العثيمين',
  'الشيخ عبد العزيز بن عبد الله بن باز',
  'الشيخ محمد ناصر الدين الألباني',
  'الشيخ محمد بن إبراهيم آل الشيخ',
  'الشيخ عبد الرحمن بن ناصر السعدي',
  'الشيخ محمد بن صالح المنجد',
]

const tags = [
  'فقه',
  'عقيدة',
  'حديث',
  'تفسير',
  'سيرة',
  'أخلاق',
  'دعوة',
  'فقه',
  'عقيدة',
  'حديث',
  'تفسير',
  'سيرة',
  'أخلاق',
  'دعوة',
]

const types: Activity['type'][] = [
  'aqidah',
  'fiqh',
  'hadith',
  'tafsir',
  'sirah',
  'language',
  'other',
]

export const createActivity = async (mediaIds: number[]) => {
  const payload = await getPayload({ config })

  const maxParticipants = faker.number.int({ min: 10, max: 100 })
  const currentParticipants = faker.number.int({ min: 0, max: maxParticipants })

  const registrationDeadline = faker.date.future().toISOString()
  const startDate = faker.date.future({ refDate: registrationDeadline }).toISOString()

  const activity = await payload.create({
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

  return activity
}

export const seedActivities = async (n: number = 10) => {
  console.log(`\n🚀 Start Seeding: ${n} activities...`)
  const startTime = Date.now()

  const payload = await getPayload({ config })

  const medias = await payload.find({
    collection: 'media',
  })

  const mediaIds = medias.docs.map((media) => media.id)

  for (let i = 0; i < n; i++) {
    const activityNumber = i + 1

    try {
      const activity = await createActivity(mediaIds)

      if (activity) {
        console.log(
          `📖 [${activityNumber}/${n}] Created: "${activity.title.substring(0, 30)}${activity.title.length > 30 ? '...' : ''}"`,
        )
      } else {
        console.warn(`⚠️  [${activityNumber}/${n}] activity creation returned null.`)
      }
    } catch (error) {
      console.error(
        `❌ [${activityNumber}/${n}] Error creating activity:`,
        error instanceof Error ? error.message : error,
      )
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2)
  console.log(`\n✨ Finished seeding ${n} articles in ${duration}s\n`)
}
