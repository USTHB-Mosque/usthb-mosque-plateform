import type { Payload } from 'payload'
import { fakerAR as faker } from '@faker-js/faker'
import { Activity } from '@/payload-types'
import { generateLexicalRichText } from './utils'
import type { SeedOptions, SeedResult } from '../seed-config'
import { withTransaction } from './with-transaction'

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

export const createActivity = async (payload: Payload, mediaIds: number[]) => {
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

export const seedActivities = async (payload: Payload, options: SeedOptions = {}): Promise<SeedResult> => {
  const count = options.count ?? 50
  const force = options.force ?? false
  const startTime = Date.now()

  console.log(`\n🚀 Start Seeding: ${count} activities...`)

  if (!force) {
    const existing = await payload.find({ collection: 'activities', limit: 1 })
    if (existing.docs.length > 0) {
      console.log('⚠️  Activities already exist. Use --force to reseed.')
      return { collection: 'activities', seeded: 0, skipped: existing.totalDocs, failed: 0, duration: 0 }
    }
  }

  if (options.dryRun) {
    console.log(`[DRY RUN] Would seed ${count} activities`)
    return { collection: 'activities', seeded: 0, skipped: 0, failed: 0, duration: 0 }
  }

  const medias = await payload.find({ collection: 'media' })
  const mediaIds = medias.docs.map((media) => media.id)

  if (mediaIds.length === 0) {
    console.warn('⚠️  No media found. Please seed media first.')
    return { collection: 'activities', seeded: 0, skipped: 0, failed: 0, duration: 0 }
  }

  const { success, error } = await withTransaction(
    payload,
    async () => {
      for (let i = 0; i < count; i++) {
        const activityNumber = i + 1
        const activity = await createActivity(payload, mediaIds)

        if (activity) {
          console.log(
            `📖 [${activityNumber}/${count}] Created: "${activity.title.substring(0, 30)}${activity.title.length > 30 ? '...' : ''}"`,
          )
        } else {
          console.warn(`⚠️  [${activityNumber}/${count}] activity creation returned null.`)
        }
      }
    },
    'activities',
  )

  const duration = (Date.now() - startTime) / 1000

  if (success) {
    console.log(`\n✨ Finished seeding ${count} activities in ${duration.toFixed(2)}s\n`)
    return { collection: 'activities', seeded: count, skipped: 0, failed: 0, duration }
  }

  return { collection: 'activities', seeded: 0, skipped: 0, failed: count, duration, error }
}
