import type { Payload } from 'payload'
import { fakerAR as faker } from '@faker-js/faker'
import { Book } from '@/payload-types'
import { generateLexicalRichText } from '../../shared/rich-text'
import { authors, tags } from './data'

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

  return await payload.create({
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
}
