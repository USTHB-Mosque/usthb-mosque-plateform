import { getPayload } from 'payload'
import config from '@/payload.config'
import { fakerAR as faker } from '@faker-js/faker'
import { Article } from '@/payload-types'
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

const types: Article['type'][] = ['aqidah', 'fiqh', 'hadith', 'other']

export const createArticle = async (mediaIds: number[]) => {
  const payload = await getPayload({ config })

  const article = await payload.create({
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

  return article
}

export const seedArticles = async (n: number = 10) => {
  console.log(`\n🚀 Start Seeding: ${n} articles...`)
  const startTime = Date.now()

  const payload = await getPayload({ config })

  const medias = await payload.find({
    collection: 'media',
  })

  const mediaIds = medias.docs.map((media) => media.id)

  for (let i = 0; i < n; i++) {
    const articleNumber = i + 1

    try {
      const article = await createArticle(mediaIds)

      if (article) {
        console.log(
          `📖 [${articleNumber}/${n}] Created: "${article.title.substring(0, 30)}${article.title.length > 30 ? '...' : ''}"`,
        )
      } else {
        console.warn(`⚠️  [${articleNumber}/${n}] article creation returned null.`)
      }
    } catch (error) {
      console.error(
        `❌ [${articleNumber}/${n}] Error creating article:`,
        error instanceof Error ? error.message : error,
      )
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2)
  console.log(`\n✨ Finished seeding ${n} articles in ${duration}s\n`)
}
