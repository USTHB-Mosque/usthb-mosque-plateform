import type { Payload } from 'payload'
import { fakerAR as faker } from '@faker-js/faker'
import { Article } from '@/payload-types'
import { generateLexicalRichText } from '../../shared/rich-text'
import { authors, tags } from './data'

const types: Article['type'][] = ['aqidah', 'fiqh', 'hadith', 'other']

export const createArticle = async (payload: Payload, mediaIds: number[]) => {
  return await payload.create({
    collection: 'articles',
    data: {
      title: faker.lorem.words(3),
      type: faker.helpers.arrayElement(types),
      author: faker.helpers.arrayElement(authors),
      description: faker.lorem.words(6),
      publishDate: faker.date.past().toISOString(),
      tags: faker.helpers
        .arrayElements(tags, 3)
        .map((tag) => ({ name: tag, id: faker.string.ulid() })),
      image: faker.helpers.arrayElement(mediaIds),
      content: generateLexicalRichText() as any,
    },
  })
}
