import { getPayload } from 'payload'
import config from '@/payload.config'
import { fakerAR as faker } from '@faker-js/faker'
import { Book, Media } from '@/payload-types'
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
  'logic',
  'mathematics',
  'physics',
  'chemistry',
  'biology',
  'engineering',
  'medicine',
  'economics',
  'politics',
  'sociology',
  'psychology',
  'language',
  'literature',
  'arts',
  'other',
]

const categories: Book['category'][] = ['religious', 'scientific']

export const createBook = async (mediaIds: number[]) => {
  const payload = await getPayload({ config })

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

export const seedBooks = async (n: number = 10) => {
  console.log(`\n🚀 Start Seeding: ${n} books...`)
  const startTime = Date.now()

  const payload = await getPayload({ config })

  const medias = await payload.find({
    collection: 'media',
  })

  const mediaIds = medias.docs.map((media) => media.id)

  for (let i = 0; i < n; i++) {
    const bookNumber = i + 1

    try {
      const book = await createBook(mediaIds)

      if (book) {
        console.log(
          `📖 [${bookNumber}/${n}] Created: "${book.title.substring(0, 30)}${book.title.length > 30 ? '...' : ''}"`,
        )
      } else {
        console.warn(`⚠️  [${bookNumber}/${n}] Book creation returned null.`)
      }
    } catch (error) {
      console.error(
        `❌ [${bookNumber}/${n}] Error creating book:`,
        error instanceof Error ? error.message : error,
      )
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2)
  console.log(`\n✨ Finished seeding ${n} books in ${duration}s\n`)
}
