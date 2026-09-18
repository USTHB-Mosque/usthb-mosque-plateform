import { Book, Media } from '@/payload-types'
import { BookType, BookCategory } from '@/features/library/types'

const media = (url: string, alt: string): Media => ({
  id: 0,
  alt,
  url,
  updatedAt: '',
  createdAt: '',
})

type StaticBookSeed = {
  id: number
  title: string
  author: string
  type: BookType
  imageUrl: string
  imageAlt: string
  tags: string[]
  shortDescription: string
}

const createBook = ({
  id,
  title,
  author,
  type,
  imageUrl,
  imageAlt,
  tags,
  shortDescription,
}: StaticBookSeed): Book => ({
  id,
  title,
  author,
  type,
  category: BookCategory.Religious,
  tags: tags.map((name) => ({ name, id: `static-book-${id}-${name}` })),
  shortDescription,
  image: media(imageUrl, imageAlt),
  availableBooks: 3,
  totalBooks: 5,
  updatedAt: '',
  createdAt: '',
})

export const staticBooks: Book[] = [
  createBook({
    id: 1,
    title: 'رياض الصالحين',
    author: 'الإمام النووي',
    type: BookType.Hadith,
    imageUrl: '/static/images/ramadan.jpg',
    imageAlt: 'رياض الصالحين',
    tags: ['حديث', 'أخلاق'],
    shortDescription: 'جامع لأبواب الزهد والرقائق ورياض الفضائل من الأحاديث النبوية.',
  }),
  createBook({
    id: 2,
    title: 'زاد المعاد في هدي خير العباد',
    author: 'ابن قيم الجوزية',
    type: BookType.Sirah,
    imageUrl: '/static/images/quran.png',
    imageAlt: 'زاد المعاد',
    tags: ['سيرة', 'فقه'],
    shortDescription: 'سيرة النبي ﷺ وهديه في العبادة والمعاملة، من أشهر كتب السيرة النبوية.',
  }),
  createBook({
    id: 3,
    title: 'فقه السنة',
    author: 'سيد سابق',
    type: BookType.Fiqh,
    imageUrl: '/static/images/quaran.jpg',
    imageAlt: 'فقه السنة',
    tags: ['فقه'],
    shortDescription: 'أبواب فقهية ميسّرة مزودة بالأدلة من الكتاب والسنة.',
  }),
  createBook({
    id: 4,
    title: 'تفسير السعدي',
    author: 'عبد الرحمن بن ناصر السعدي',
    type: BookType.Tafsir,
    imageUrl: '/static/images/quaran2.jpg',
    imageAlt: 'تفسير السعدي',
    tags: ['تفسير', 'عقيدة'],
    shortDescription: 'تفسير كلام الله بأسلوب ميسّر يجمع بين المعنى والهداية.',
  }),
]