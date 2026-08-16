import { Article, Media } from '@/payload-types'
import { ArticleType } from '@/interfaces/articles.interfaces'

const media = (url: string, alt: string): Media => ({
  id: 0,
  alt,
  url,
  updatedAt: '',
  createdAt: '',
})

type StaticArticleSeed = {
  id: number
  title: string
  author: string
  type: ArticleType
  imageUrl: string
  imageAlt: string
  tags: string[]
  description: string
  publishDate: string
}

const createArticle = ({
  id,
  title,
  author,
  type,
  imageUrl,
  imageAlt,
  tags,
  description,
  publishDate,
}: StaticArticleSeed): Article => ({
  id,
  title,
  author,
  type,
  tags: tags.map((name) => ({ name, id: `static-article-${id}-${name}` })),
  image: media(imageUrl, imageAlt),
  description,
  publishDate,
  updatedAt: '',
  createdAt: '',
})

export const staticArticles: Article[] = [
  createArticle({
    id: 1,
    title: 'فضائل المسجد وأثره في حياة الطالب',
    author: 'الشيخ محمد بن صالح العثيمين',
    type: ArticleType.Aqidah,
    imageUrl: '/static/images/mosque-1.jpg',
    imageAlt: 'المسجد الجامع',
    tags: ['دعوة', 'أخلاق'],
    description: 'كيف يكون المسجد منارة علم وإيمان في قلب الجامعة.',
    publishDate: '2025-01-15T00:00:00.000Z',
  }),
  createArticle({
    id: 2,
    title: 'آداب طالب العلم مع أستاذه',
    author: 'الشيخ عبد العزيز بن عبد الله بن باز',
    type: ArticleType.Fiqh,
    imageUrl: '/static/images/usthb-mosque.jpg',
    imageAlt: 'مسجد الجامعة',
    tags: ['علم', 'أدب'],
    description: 'أهم الآداب التي ينبغي أن يتحلى بها طالب العلم في مجلس العلم.',
    publishDate: '2025-02-02T00:00:00.000Z',
  }),
  createArticle({
    id: 3,
    title: 'التحذير من الفتور في العبادة',
    author: 'الشيخ محمد ناصر الدين الألباني',
    type: ArticleType.Hadith,
    imageUrl: '/static/images/quaran.jpg',
    imageAlt: 'حلقات القرآن',
    tags: ['حديث', 'أخلاق'],
    description: 'أثر المداومة على الطاعات ولو كانت قليلة في استقامة القلب.',
    publishDate: '2025-03-08T00:00:00.000Z',
  }),
]