import type { Payload } from 'payload'
import { fakerAR as faker } from '@faker-js/faker'
import { Book, Media } from '@/payload-types'
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

const types: Book['type'][] = [
  'aqidah',
  'fiqh',
  'hadith',
  'tafsir',
  'sirah',
  'quranic-sciences',
  'dawah',
  'history',
  'philosophy',
  'mathematics',
  'physics',
  'chemistry',
  'biology',
  'engineering',
  'economics',
  'language',
  'other',
]

const categories: Book['category'][] = ['religious', 'scientific']

export const createBook = async (payload: Payload, mediaIds: number[]) => {
  const totalBooks = faker.number.int({ min: 1, max: 100 })
  const availableBooks = faker.number.int({ min: 0, max: totalBooks })

  const book = await payload.create({
    collection: 'books',
    data: {
      title: faker.lorem.words(3),
      author: faker.helpers.arrayElement(authors),
      shortDescription: faker.lorem.words(10),
      type: faker.helpers.arrayElement(types),
      totalBooks,
      availableBooks,
      averageRating: faker.number.int({ min: 0, max: 5 }),
      ratingCount: faker.number.int({ min: 0, max: 100 }),
      tags: faker.helpers
        .arrayElements(tags, 3)
        .map((tag) => ({ name: tag, id: faker.string.ulid() })),
      publisher: faker.company.name(),
      language: faker.helpers.arrayElement(['ar', 'en', 'fr']),
      pageCount: faker.number.int({ min: 100, max: 1000 }),
      isbn: faker.string.numeric(13),
      editionNumber: faker.number.int({ min: 1, max: 100 }).toString(),
      location: faker.location.city(),
      publishDate: faker.date.past().toISOString(),
      image: faker.helpers.arrayElement(mediaIds),
      longDescription: generateLexicalRichText() as any,
      category: faker.helpers.arrayElement(categories),
    },
  })

  return book
}

export const seedBooks = async (payload: Payload, options: SeedOptions = {}): Promise<SeedResult> => {
  const count = options.count ?? 50
  const force = options.force ?? false
  const startTime = Date.now()

  console.log(`\n🚀 Start Seeding: ${count} books...`)

  if (!force) {
    const existing = await payload.find({ collection: 'books', limit: 1 })
    if (existing.docs.length > 0) {
      console.log('⚠️  Books already exist. Use --force to reseed.')
      return { collection: 'books', seeded: 0, skipped: existing.totalDocs, failed: 0, duration: 0 }
    }
  }

  if (options.dryRun) {
    console.log(`[DRY RUN] Would seed ${count} books`)
    return { collection: 'books', seeded: 0, skipped: 0, failed: 0, duration: 0 }
  }

  const medias = await payload.find({ collection: 'media' })
  const mediaIds = medias.docs.map((media) => media.id)

  if (mediaIds.length === 0) {
    console.warn('⚠️  No media found. Please seed media first.')
    return { collection: 'books', seeded: 0, skipped: 0, failed: 0, duration: 0 }
  }

  const { success, error } = await withTransaction(
    payload,
    async () => {
      for (let i = 0; i < count; i++) {
        const bookNumber = i + 1
        const book = await createBook(payload, mediaIds)

        if (book) {
          console.log(
            `📖 [${bookNumber}/${count}] Created: "${book.title.substring(0, 30)}${book.title.length > 30 ? '...' : ''}"`,
          )
        } else {
          console.warn(`⚠️  [${bookNumber}/${count}] Book creation returned null.`)
        }
      }
    },
    'books',
  )

  const duration = (Date.now() - startTime) / 1000

  if (success) {
    console.log(`\n✨ Finished seeding ${count} books in ${duration.toFixed(2)}s\n`)
    return { collection: 'books', seeded: count, skipped: 0, failed: 0, duration }
  }

  return { collection: 'books', seeded: 0, skipped: 0, failed: count, duration, error }
}
