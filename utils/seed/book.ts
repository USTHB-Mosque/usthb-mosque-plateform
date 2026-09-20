import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Book } from '@/payload-types'

interface BookData {
  title: string
  author: string
  type: Book['type']
  category: Book['category']
  shortDescription: string
  longDescription: string
  tags: string[]
  publisher: string
  language: 'ar' | 'en' | 'fr'
  pageCount: number
  isbn: string
  editionNumber: string
  location: string
  totalBooks: number
  availableBooks: number
  averageRating: number
  ratingCount: number
}

const booksData: BookData[] = [
  {
    title: 'صحيح البخاري',
    author: 'الإمام محمد بن إسماعيل البخاري',
    type: 'hadith',
    category: 'religious',
    shortDescription:
      'أصح كتاب بعد كتاب الله تعالى، جمع فيه الإمام البخاري أحاديث النبي ﷺ المرفوعة معتمداً على شروطه الصارمة في التخريج.',
    longDescription:
      'صحيح البخاري هو أشهر كتب الحديث النبوي الشريف، ألّفه الإمام أبو عبد الله محمد بن إسماعيل البخاري (ت 256 هـ). اشترط البخاري في صحيحه شروطاً صارمة في قبول الحديث، فلم يصحّح إلا ما اتفق العلماء على صحّته.',
    tags: ['حديث', 'عقيدة'],
    publisher: 'دار طوق النجاة',
    language: 'ar',
    pageCount: 4500,
    isbn: '9786035000123',
    editionNumber: '1',
    location: 'المكتبة المركزية',
    totalBooks: 5,
    availableBooks: 2,
    averageRating: 5,
    ratingCount: 120,
  },
  {
    title: 'صحيح مسلم',
    author: 'الإمام مسلم بن الحجاج النيسابوري',
    type: 'hadith',
    category: 'religious',
    shortDescription:
      'الكتاب الثاني في مرتبة كتب الحديث النبوي، يضم أحاديث نبوية شريفة مصّنة بشرط الصحيح.',
    longDescription:
      'صحيح مسلم هو ثاني أصح كتب الحديث بعد صحيح البخاري، ألّفه الإمام مسلم بن الحجاج (ت 261 هـ). يتميز بترتيبه الفريد وتشعبه في تخريج الأحاديث المشابهة.',
    tags: ['حديث'],
    publisher: 'دار إحياء التراث العربي',
    language: 'ar',
    pageCount: 3800,
    isbn: '9786035000456',
    editionNumber: '1',
    location: 'المكتبة المركزية',
    totalBooks: 5,
    availableBooks: 3,
    averageRating: 5,
    ratingCount: 95,
  },
  {
    title: 'رياض الصالحين',
    author: 'الإمام يحيى بن شرف النووي',
    type: 'hadith',
    category: 'religious',
    shortDescription:
      'من أشهر كتب الإمام النووي، جمع فيه الأحاديث النبوية المرتبطة بآداب وأخلاق المسلم.',
    longDescription:
      'رياض الصالحين هو من أعظم ما صنف الإمام النووي (ت 676 هـ) من كتب الحديث. قسّمه أبواباً تبدأ بالنيّة وتنتهي بذم الرياء.',
    tags: ['حديث', 'أخلاق'],
    publisher: 'مؤسسة الرسالة',
    language: 'ar',
    pageCount: 1200,
    isbn: '9789953429523',
    editionNumber: '8',
    location: 'المكتبة المركزية',
    totalBooks: 8,
    availableBooks: 5,
    averageRating: 4.8,
    ratingCount: 80,
  },
  {
    title: 'العقيدة الواسطية',
    author: 'شيخ الإسلام أحمد بن عبد الحليم ابن تيمية',
    type: 'aqidah',
    category: 'religious',
    shortDescription: 'رسالة مختصرة في أصول الدين تشمل أركان الإيمان والتوحيد.',
    longDescription:
      'العقيدة الواسطية هي رسالة مختصرة كتبها شيخ الإسلام ابن تيمية (ت 728 هـ) لبعض أهل واسط، تتضمن عقيدة أهل السنة والجماعة في أركان الإيمان.',
    tags: ['عقيدة'],
    publisher: 'دار العاصمة',
    language: 'ar',
    pageCount: 80,
    isbn: '9786035000789',
    editionNumber: '1',
    location: 'المكتبة المركزية',
    totalBooks: 10,
    availableBooks: 7,
    averageRating: 4.7,
    ratingCount: 65,
  },
  {
    title: 'زاد المعاد في هدي خير العباد',
    author: 'الإمام محمد بن أبي بكر ابن قيم الجوزية',
    type: 'sirah',
    category: 'religious',
    shortDescription: 'كتاب في سيرة النبي ﷺ وشريعته، يشمل أحكام العبادات والمعاملات.',
    longDescription:
      'زاد المعاد من أعظم كتب الإمام ابن القيم (ت 751 هـ)، حيث شرح فيه هدي النبي ﷺ في جميع شؤون الحياة.',
    tags: ['سيرة', 'فقه'],
    publisher: 'مؤسسة الرسالة',
    language: 'ar',
    pageCount: 1800,
    isbn: '9789953429524',
    editionNumber: '5',
    location: 'المكتبة المركزية',
    totalBooks: 4,
    availableBooks: 1,
    averageRating: 4.9,
    ratingCount: 70,
  },
  {
    title: 'تفسير السعدي',
    author: 'الإمام عبد الرحمن بن ناصر السعدي',
    type: 'tafsir',
    category: 'religious',
    shortDescription: 'تفسير ميسر للقرآن الكريم يسر المعاني ويوضح المرامات.',
    longDescription:
      'تفسير السعدي هو تفسير ميسر لكتاب الله تعالى، ألّفه الإمام السعدي (ت 1376 هـ) ليكون في متناول الجميع.',
    tags: ['تفسير'],
    publisher: 'دار ابن الجوزي',
    language: 'ar',
    pageCount: 2500,
    isbn: '9786035000567',
    editionNumber: '1',
    location: 'المكتبة المركزية',
    totalBooks: 6,
    availableBooks: 4,
    averageRating: 4.6,
    ratingCount: 55,
  },
  {
    title: 'الفقه على المذاهب الأربعة',
    author: 'الإمام عبد الرحمن الجزيري',
    type: 'fiqh',
    category: 'religious',
    shortDescription: 'كتاب جامع في فقه المذاهب الأربعة (الحنفي والشافعي والمالكي والحنابلة).',
    longDescription:
      'الفقه على المذاهب الأربعة للإمام الجزيري (ت 1360 هـ) هو من أشهر الكتب الفقهية المقارنة.',
    tags: ['فقه'],
    publisher: 'دار الكتب العلمية',
    language: 'ar',
    pageCount: 4000,
    isbn: '9786035000890',
    editionNumber: '3',
    location: 'المكتبة المركزية',
    totalBooks: 5,
    availableBooks: 3,
    averageRating: 4.7,
    ratingCount: 90,
  },
  {
    title: 'الموافقات في أصول الشريعة',
    author: 'الإمام أبي إسحاق الشاطبي',
    type: 'fiqh',
    category: 'religious',
    shortDescription: 'من أعظم كتب أصول الفقه، يبحث في مقاصد الشريعة الإسلامية.',
    longDescription:
      'الموافقات للشاطبي (ت 790 هـ) هو من أعظم كتب أصول الفقه، حيث بحث في مقاصد الشريعة وأسرارها.',
    tags: ['فقه'],
    publisher: 'دار ابن عفان',
    language: 'ar',
    pageCount: 3200,
    isbn: '9786035000678',
    editionNumber: '1',
    location: 'المكتبة المركزية',
    totalBooks: 3,
    availableBooks: 2,
    averageRating: 4.8,
    ratingCount: 40,
  },
  {
    title: 'الرحيق المختوم',
    author: 'الدكتور صفي الرحمن المباركفوري',
    type: 'sirah',
    category: 'religious',
    shortDescription: 'بحث في السيرة النبوية فاز بالجائزة الأولى في مسابقة السيرة النبوية.',
    longDescription:
      'الرحيق المختوم هو بحث متقن في السيرة النبوية، فاز بالجائزة الأولى في مسابقة السيرة التي أقامتها رابطة العالم الإسلامي.',
    tags: ['سيرة'],
    publisher: 'دار السلام',
    language: 'ar',
    pageCount: 600,
    isbn: '9786035000345',
    editionNumber: '1',
    location: 'المكتبة المركزية',
    totalBooks: 7,
    availableBooks: 5,
    averageRating: 4.5,
    ratingCount: 60,
  },
  {
    title: 'أساسيات الرياضيات',
    author: 'الدكتور محمد المرسي',
    type: 'mathematics',
    category: 'scientific',
    shortDescription: 'كتاب تأسيسي في الرياضيات للمبتدئين يشمل العمليات الحسابية والجبر والهندسة.',
    longDescription:
      'كتاب أساسي في الرياضيات يغطي العمليات الحسابية والجبر الأساسي والهندسة للطلاب الجامعيين.',
    tags: ['رياضيات'],
    publisher: 'دار النهضة',
    language: 'ar',
    pageCount: 350,
    isbn: '9786035001012',
    editionNumber: '2',
    location: 'المكتبة المركزية',
    totalBooks: 10,
    availableBooks: 8,
    averageRating: 4.0,
    ratingCount: 25,
  },
  {
    title: 'فيزياء عامة',
    author: 'الدكتور أحمد المنصور',
    type: 'physics',
    category: 'scientific',
    shortDescription: 'كتاب في الفيزياء العامة يشمل الميكانيكا والكهرباء والظواهر الطبيعية.',
    longDescription:
      'كتاب متكامل في الفيزياء العامة يشرح المبادئ الأساسية والقوانين الفيزيائية للطلاب.',
    tags: ['فيزياء'],
    publisher: 'دار الفكر',
    language: 'ar',
    pageCount: 450,
    isbn: '9786035001023',
    editionNumber: '1',
    location: 'المكتبة المركزية',
    totalBooks: 8,
    availableBooks: 6,
    averageRating: 4.2,
    ratingCount: 35,
  },
  {
    title: 'مبادئ علم الأحياء',
    author: 'ليزا أوري',
    type: 'biology',
    category: 'scientific',
    shortDescription: 'كتاب مكمل في علم الأحياء يشمل التنظيم الخلوي والوراثة والتطور.',
    longDescription:
      'كتاب أكاديمي شامل في علم الأحياء يغطي التنظيم الخلوي والوراثة والتطور والبيئة.',
    tags: ['أحياء'],
    publisher: 'Pearson',
    language: 'en',
    pageCount: 800,
    isbn: '9786035001034',
    editionNumber: '12',
    location: 'المكتبة المركزية',
    totalBooks: 5,
    availableBooks: 3,
    averageRating: 4.3,
    ratingCount: 20,
  },
  {
    title: 'لغة عربية للمبتدئين',
    author: 'الدكتور أحمد محمد',
    type: 'language',
    category: 'scientific',
    shortDescription: 'كتاب تأسيسي في اللغة العربية للمبتدئين من غير الناطقين بالعربية.',
    longDescription: 'كتاب مبسط في اللغة العربية يشمل القواعد الأساسية والتدريبات العملية.',
    tags: ['لغة عربية'],
    publisher: 'دار المعارف',
    language: 'ar',
    pageCount: 300,
    isbn: '9786035001045',
    editionNumber: '1',
    location: 'المكتبة المركزية',
    totalBooks: 12,
    availableBooks: 10,
    averageRating: 4.1,
    ratingCount: 45,
  },
  {
    title: 'مبادئ الاقتصاد',
    author: 'ن. غريغوري مانكيو',
    type: 'economics',
    category: 'scientific',
    shortDescription: 'كتاب مرجع في الاقتصاد للطلاب الجامعيين.',
    longDescription: 'كتاب مرجعي شهير في العلوم الاقتصادية مخصص لطلاب الجامعات.',
    tags: ['اقتصاد'],
    publisher: 'Cengage Learning',
    language: 'en',
    pageCount: 700,
    isbn: '9786035001056',
    editionNumber: '9',
    location: 'المكتبة المركزية',
    totalBooks: 6,
    availableBooks: 4,
    averageRating: 4.4,
    ratingCount: 50,
  },
  {
    title: 'كيمياء عامة',
    author: 'الدكتور كريم حسن',
    type: 'chemistry',
    category: 'scientific',
    shortDescription: 'كتاب في الكيمياء العامة لطلاب الكيمياء.',
    longDescription: 'كتاب شامل في الكيمياء العامة لطلاب العلوم الكيميائية.',
    tags: ['كيمياء'],
    publisher: 'Dunod',
    language: 'fr',
    pageCount: 550,
    isbn: '9786035001067',
    editionNumber: '4',
    location: 'المكتبة المركزية',
    totalBooks: 4,
    availableBooks: 2,
    averageRating: 4.0,
    ratingCount: 15,
  },
  {
    title: 'أساسيات الهندسة',
    author: 'سالم المكنوني',
    type: 'engineering',
    category: 'scientific',
    shortDescription: 'كتاب أساسي في الهندسة لطلاب الهندسة.',
    longDescription: 'كتاب مرجعي في أساسيات الهندسة لطلاب الهندسة الميكانيكية والكهرباء.',
    tags: ['هندسة'],
    publisher: 'Cengage Learning',
    language: 'en',
    pageCount: 650,
    isbn: '9786035001078',
    editionNumber: '5',
    location: 'المكتبة المركزية',
    totalBooks: 5,
    availableBooks: 3,
    averageRating: 4.3,
    ratingCount: 28,
  },
  {
    title: 'تاريخ الإسلام',
    author: 'الإمام محمد بن أحمد الذهبي',
    type: 'history',
    category: 'religious',
    shortDescription: 'كتاب جامع في تاريخ الإسلام من البعثة النبوية حتى عصر المؤلف.',
    longDescription:
      'تاريخ الإسلام هو من أعظم كتب التاريخ الإسلامي، ألّفه الإمام الذهبي (ت 748 هـ).',
    tags: ['تاريخ'],
    publisher: 'دار الكتب العلمية',
    language: 'ar',
    pageCount: 5000,
    isbn: '9786035001089',
    editionNumber: '1',
    location: 'المكتبة المركزية',
    totalBooks: 3,
    availableBooks: 1,
    averageRating: 4.9,
    ratingCount: 55,
  },
  {
    title: 'العلمانية والدين',
    author: 'الدكتور طه عبد الرحمن',
    type: 'philosophy',
    category: 'religious',
    shortDescription: 'دراسة نقدية للعلاقة بين العلمانية والدين في الفكر المعاصر.',
    longDescription: 'كتاب فلسفي يبحث في العلاقة بين العلمانية والدين ويقدم نقداً متكاملاً.',
    tags: ['فلسفة'],
    publisher: 'دار الفكر',
    language: 'ar',
    pageCount: 400,
    isbn: '9786035001090',
    editionNumber: '1',
    location: 'المكتبة المركزية',
    totalBooks: 4,
    availableBooks: 3,
    averageRating: 4.2,
    ratingCount: 18,
  },
  {
    title: 'آداب الدعوة إلى الله تعالى',
    author: 'الإمام عبد الرحمن حبنكة المحمدي',
    type: 'dawah',
    category: 'religious',
    shortDescription: 'كتاب في آداب وسائل الدعوة الإسلامية وطرقها الصحيحة.',
    longDescription:
      'كتاب مفيد في آداب الدعوة الإسلامية يشرح الطرق الصحيحة والآداب اللازمة للدعاة.',
    tags: ['دعوة', 'أخلاق'],
    publisher: 'دار البشائر الإسلامية',
    language: 'ar',
    pageCount: 350,
    isbn: '9786035001100',
    editionNumber: '1',
    location: 'المكتبة المركزية',
    totalBooks: 6,
    availableBooks: 4,
    averageRating: 4.4,
    ratingCount: 32,
  },
]

function buildLongDescription(title: string, description: string): Record<string, unknown> {
  return {
    root: {
      type: 'root',
      format: 'right',
      indent: 0,
      version: 1,
      direction: 'rtl',
      children: [
        {
          type: 'heading',
          tag: 'h1',
          format: 'right',
          indent: 0,
          version: 1,
          children: [{ text: title, type: 'text', version: 1 }],
        },
        {
          type: 'paragraph',
          format: 'right',
          indent: 0,
          version: 1,
          children: [{ text: description, type: 'text', version: 1 }],
        },
        {
          type: 'paragraph',
          format: 'right',
          indent: 0,
          version: 1,
          children: [
            {
              text: 'يُعدّ هذا الكتاب من أبرز المؤلفات في مجاله، وقد حظي باهتمام واسع من العلماء والمهتمين. يتناول الكتاب الموضوع بشكل شامل ومفصل، مع التركيز على الجوانب التطبيقية والنظرية معاً.',
              type: 'text',
              version: 1,
            },
          ],
        },
        {
          type: 'list',
          listType: 'bullet',
          tag: 'ul',
          format: 'right',
          indent: 0,
          version: 1,
          children: [
            {
              type: 'listitem',
              value: 1,
              version: 1,
              children: [{ text: 'نهج شامل ومتكامل للموضوع', type: 'text', version: 1 }],
            },
            {
              type: 'listitem',
              value: 2,
              version: 1,
              children: [{ text: 'مناسب للمبتدئين والمتقدمين', type: 'text', version: 1 }],
            },
            {
              type: 'listitem',
              value: 3,
              version: 1,
              children: [{ text: 'يحتوي على أمثلة وتدريبات عملية', type: 'text', version: 1 }],
            },
          ],
        },
        {
          type: 'quote',
          format: 'right',
          indent: 0,
          version: 1,
          children: [{ text: 'العلم نور والجهل ظلام', type: 'text', version: 1 }],
        },
      ],
    },
  }
}

export const seedBooks = async () => {
  const payload = await getPayload({ config })

  // Delete existing books and related data
  const existingReviews = await payload.find({ collection: 'reviews', limit: 200 })
  for (const review of existingReviews.docs) {
    await payload.delete({ collection: 'reviews', id: review.id })
  }
  console.log(`Deleted ${existingReviews.docs.length} old reviews`)

  const existingFavorites = await payload.find({ collection: 'book-favorites', limit: 200 })
  for (const fav of existingFavorites.docs) {
    await payload.delete({ collection: 'book-favorites', id: fav.id })
  }
  console.log(`Deleted ${existingFavorites.docs.length} old favorites`)

  const existingLoans = await payload.find({ collection: 'loans', limit: 200 })
  for (const loan of existingLoans.docs) {
    await payload.delete({ collection: 'loans', id: loan.id })
  }
  console.log(`Deleted ${existingLoans.docs.length} old loans`)

  const existing = await payload.find({ collection: 'books', limit: 200 })
  for (const book of existing.docs) {
    await payload.delete({ collection: 'books', id: book.id })
  }
  console.log(`Deleted ${existing.docs.length} old books`)

  // Fetch media for images
  const medias = await payload.find({ collection: 'media', limit: 20 })
  const mediaIds = medias.docs.map((m) => m.id)

  for (const bookData of booksData) {
    const imageId = mediaIds[Math.floor(Math.random() * mediaIds.length)] || mediaIds[0]

    await payload.create({
      collection: 'books',
      data: {
        title: bookData.title,
        author: bookData.author,
        type: bookData.type,
        category: bookData.category,
        shortDescription: bookData.shortDescription,
        longDescription: buildLongDescription(bookData.title, bookData.longDescription) as any,
        tags: bookData.tags.map((name) => ({ name })),
        publisher: bookData.publisher,
        language: bookData.language,
        pageCount: bookData.pageCount,
        isbn: bookData.isbn,
        editionNumber: bookData.editionNumber,
        location: bookData.location,
        totalBooks: bookData.totalBooks,
        availableBooks: bookData.availableBooks,
        averageRating: bookData.averageRating,
        ratingCount: bookData.ratingCount,
        image: imageId,
        publishDate: new Date(
          Date.now() - Math.random() * 10 * 365 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      },
    })
    console.log(`Created: ${bookData.title}`)
  }

  console.log(`\nSeeded ${booksData.length} books successfully`)
}
