import { beforeEach, describe, expect, it } from 'vitest'

import {
  MAX_CSV_BYTES,
  MAX_IMAGE_BYTES,
  fetchImageBuffer,
  parseBooksCsv,
  parseCsvText,
  parseUsersCsv,
} from './csv-core'

function csv(rows: string[][]): string {
  return rows
    .map((cells) =>
      cells
        .map((cell) => (cell.includes(',') || cell.includes('\n') ? `"${cell}"` : cell))
        .join(','),
    )
    .join('\n')
}

const BOOK_HEADER = [
  'title',
  'author',
  'type',
  'category',
  'shortDescription',
  'longDescription',
  'publisher',
  'language',
  'pageCount',
  'isbn',
  'editionNumber',
  'publishDate',
  'totalBooks',
  'availableBooks',
  'location',
  'imageUrl',
]

function bookCsv(...rows: string[][]): string {
  return csv([BOOK_HEADER, ...rows])
}

const USER_HEADER = [
  'email',
  'password',
  'fullName',
  'phone',
  'faculty',
  'speciality',
  'studyYear',
  'situation',
  'role',
  'verificationStatus',
]

function userCsv(...rows: string[][]): string {
  return csv([USER_HEADER, ...rows])
}

function fakeResponse(ok: boolean, contentType: string | null, bytes = 3): Response {
  return {
    ok,
    headers: { get: (h: string) => (h === 'content-type' ? contentType : null) },
    arrayBuffer: async () => Buffer.alloc(bytes),
  } as unknown as Response
}

let fetchCounter = 0
function fakeFetch(response: Response): typeof fetch {
  return (async () => {
    fetchCounter += 1
    return response
  }) as typeof fetch
}

describe('parseCsvText', () => {
  it('strips the BOM, trims cells, normalizes headers and drops unknown columns', () => {
    const text =
      '\uFEFFTitle,AUTHOR,short-description,unknown,image URL\n' +
      '  كتاب , مؤلف1 , يصف الكتاب , زائدة , https://x/pic.png'

    const result = parseCsvText(text)
    expect(result.rows).toEqual([
      {
        title: 'كتاب',
        author: 'مؤلف1',
        shortDescription: 'يصف الكتاب',
        imageUrl: 'https://x/pic.png',
      },
    ])
    expect(result.found).toEqual(['title', 'author', 'shortDescription', 'imageUrl'])
  })

  it('rejects oversized files', () => {
    const result = parseCsvText('a'.repeat(MAX_CSV_BYTES + 1))
    expect(result.error).toBe('الملف كبير جداً — الحد الأقصى 2MB')
    expect(result.rows).toEqual([])
  })

  it('honours quoted cells containing commas and skips empty lines', () => {
    const result = parseCsvText('title,author\n"x, y",2\n\n,3')
    expect(result.rows).toEqual([
      { title: 'x, y', author: '2' },
      { title: '', author: '3' },
    ])
  })
})

describe('parseBooksCsv', () => {
  it('parses a valid row with every field, mapping Arabic labels', () => {
    const text = bookCsv([
      'الفوائد',
      'ابن قيم الجوزية',
      'عقيدة,فقه',
      'دينية',
      'مجموعة فوائد',
      'وصف كامل\nالشطر الثاني',
      'دار النشر',
      'العربية',
      '320',
      '978-1-2-3-4',
      'الأولى',
      '2020-05-01',
      '5',
      '3',
      'المكتبة المركزية',
      'https://x/cover.png',
    ])

    const result = parseBooksCsv(text)
    expect(result.total).toBe(1)
    expect(result.validCount).toBe(1)
    expect(result.invalidCount).toBe(0)
    expect(result.errors).toEqual([])
    expect(result.preview).toHaveLength(1)

    const data = result.preview[0].values
    expect(data.title).toBe('الفوائد')
    expect(result.validCount).toBe(1)
  })

  it('maps multiple book types split by separators and value aliases', () => {
    const text = bookCsv(
      ['أ', 'ب', 'aqidah;hadith,سيرة', 'religious', 'قصير'],
      ['ج', 'د', 'رياضيات', '', 'وصف'],
    )
    const result = parseBooksCsv(text)
    expect(result.validCount).toBe(2)
    expect(result.invalidCount).toBe(0)
  })

  it('flags a missing required column', () => {
    const text = csv([
      ['title', 'type', 'shortDescription'],
      ['كتاب', 'عقيدة', 'وصف'],
    ])
    const result = parseBooksCsv(text)
    expect(result.validCount).toBe(0)
    expect(result.invalidCount).toBe(1)
    expect(result.errors[0].message).toContain('أعمدة مفقودة: author')
  })

  it('reports every field-level problem in a row', () => {
    const text = bookCsv([
      '',
      '',
      'unknown',
      'فهرسة',
      'وصف',
      '',
      '',
      'xx',
      '-3',
      '',
      '',
      '24012020',
      '',
      '',
      '',
      '',
    ])
    const result = parseBooksCsv(text)
    expect(result.validCount).toBe(0)
    expect(result.invalidCount).toBe(1)
    const messages = result.errors[0].message
    expect(messages).toContain('العنوان مطلوب')
    expect(messages).toContain('المؤلف مطلوب')
    expect(messages).toContain('تصنيف غير معروف: "unknown"')
    expect(messages).toContain('فئة غير معروفة: "فهرسة"')
    expect(messages).toContain('لغة غير معروفة: "xx"')
    expect(messages).toContain('عدد الصفحات يجب أن يكون رقماً غير سالب')
    expect(messages).toContain('تاريخ النشر يجب أن يكون بصيغة YYYY-MM-DD')
    expect(messages).toContain('؛')
  })

  it('accepts zero and missing optional numbers', () => {
    const text = bookCsv([
      'أ',
      'ب',
      'عقيدة',
      '',
      'وصف',
      '',
      '',
      '',
      '0',
      '',
      '',
      '',
      '0',
      '0',
      '',
      '',
    ])
    const result = parseBooksCsv(text)
    expect(result.invalidCount).toBe(0)
    expect(result.validCount).toBe(1)
  })

  it('detects in-file ISBN duplicates on both rows', () => {
    const text = bookCsv(
      ['أ', 'ب', 'عقيدة', '', 'وصف', '', '', '', '', '978-5'],
      ['ج', 'د', 'فقه', '', 'وصف آخر', '', '', '', '', '978-5'],
    )
    const result = parseBooksCsv(text)
    expect(result.validCount).toBe(0)
    expect(result.invalidCount).toBe(2)
    expect(result.errors).toHaveLength(2)
    expect(result.errors[0].message).toContain('ISBN مكرر في نفس الملف مع السطر 3')
    expect(result.errors[1].message).toContain('ISBN مكرر في نفس الملف مع السطر 2')
  })

  it('allows distinct ISBNs', () => {
    const text = bookCsv(
      ['أ', 'ب', 'عقيدة', '', 'وصف', '', '', '', '', '978-1'],
      ['ج', 'د', 'فقه', '', 'وصف آخر', '', '', '', '', '978-2'],
    )
    expect(parseBooksCsv(text).invalidCount).toBe(0)
  })

  it('requires a type and a short description when non-empty columns exist', () => {
    const text = bookCsv(['كتاب', 'مؤلف', '', '', '', '', '', '', '', ''])
    const result = parseBooksCsv(text)
    expect(result.invalidCount).toBe(1)
    const messages = result.errors[0].message
    expect(messages).toContain('التصنيف مطلوب')
    expect(messages).toContain('الوصف المختصر مطلوب')
  })
})

describe('parseUsersCsv', () => {
  it('parses a valid member row with Arabic labels and defaultValue aliases', () => {
    const text = userCsv(
      ['a@x.dz', 'password1', 'محمد', '055', 'كلية', 'تخصص', '3', 'طالب', 'عضو', 'مُتحقق منه'],
      ['b@x.dz', 'password2', '', '', '', '', '', '', '', ''],
    )
    const result = parseUsersCsv(text)
    expect(result.total).toBe(2)
    expect(result.validCount).toBe(2)
    expect(result.invalidCount).toBe(0)
  })

  it('flags a missing required column', () => {
    const text = csv([
      ['email', 'fullName'],
      ['a@x.dz', 'اسم'],
    ])
    const result = parseUsersCsv(text)
    expect(result.invalidCount).toBe(1)
    expect(result.errors[0].message).toContain('أعمدة مفقودة: password')
  })

  it('reports invalid emails, missing and short passwords', () => {
    const text = userCsv(['not-an-email', 'abc', '', '', '', '', '', '', '', ''])
    const result = parseUsersCsv(text)
    expect(result.validCount).toBe(0)
    const messages = result.errors[0].message
    expect(messages).toContain('بريد إلكتروني غير صالح')
    expect(messages).toContain('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
  })

  it('reports invalid studyYear, situation, role and verificationStatus', () => {
    const text = userCsv(['a@x.dz', 'password1', '', '', '', '', '6', 'مجهول', 'ملك', 'قريباً'])
    const result = parseUsersCsv(text)
    expect(result.validCount).toBe(0)
    const messages = result.errors[0].message
    expect(messages).toContain('سنة الدراسة غير معروفة: "6"')
    expect(messages).toContain('الوضعية غير معروفة: "مجهول"')
    expect(messages).toContain('الدور غير معروف: "ملك"')
    expect(messages).toContain('حالة التحقق غير معروفة: "قريباً"')
  })

  it('detects in-file duplicate emails case-insensitively', () => {
    const text = userCsv(
      ['a@x.dz', 'password1', '', '', '', '', '', '', '', ''],
      ['A@X.DZ', 'password2', '', '', '', '', '', '', '', ''],
    )
    const result = parseUsersCsv(text)
    expect(result.invalidCount).toBe(2)
    expect(result.errors[0].message).toContain('بريد مكرر في نفس الملف مع السطر 3')
  })

  it('accepts value aliases for role and verification', () => {
    const text = userCsv(['a@x.dz', 'password1', '', '', '', '', '', '', 'librarian', 'verified'])
    const result = parseUsersCsv(text)
    expect(result.invalidCount).toBe(0)
    expect(result.validCount).toBe(1)
  })

  it('accepts admin, pending and rejected aliases', () => {
    const text = userCsv(
      ['a@x.dz', 'password1', '', '', '', '', '', '', 'admin', 'pending'],
      ['b@x.dz', 'password1', '', '', '', '', '', '', 'مشرف', 'pending_verification'],
      ['c@x.dz', 'password1', '', '', '', '', '', '', '', 'rejected'],
      ['d@x.dz', 'password1', '', '', '', '', '', '', '', 'مرفوض'],
    )
    const result = parseUsersCsv(text)
    expect(result.invalidCount).toBe(0)
    expect(result.validCount).toBe(4)
  })

  it('flags an empty email', () => {
    const text = userCsv(['', 'password1', '', '', '', '', '', '', '', ''])
    const result = parseUsersCsv(text)
    expect(result.invalidCount).toBe(1)
    expect(result.errors[0].message).toContain('البريد الإلكتروني مطلوب')
  })

  it('flags an empty password', () => {
    const text = userCsv(['a@x.dz', '', '', '', '', '', '', '', '', ''])
    const result = parseUsersCsv(text)
    expect(result.invalidCount).toBe(1)
    expect(result.errors[0].message).toContain('كلمة المرور مطلوبة')
  })

  it('reports missing columns for a header-only file', () => {
    const result = parseUsersCsv('email,password')
    expect(result.total).toBe(0)
    expect(result.validCount).toBe(0)
    expect(result.errors).toEqual([])
    expect(result.preview).toEqual([])
  })
})

describe('fetchImageBuffer', () => {
  beforeEach(() => {
    fetchCounter = 0
  })

  it('downloads a valid image', async () => {
    const result = await fetchImageBuffer(
      'https://x/pic.png',
      fakeFetch(fakeResponse(true, 'image/png')),
    )
    expect(result.ok).toBe(true)
    expect(result.buffer?.byteLength).toBe(3)
    expect(result.mimetype).toBe('image/png')
    expect(fetchCounter).toBe(1)
  })

  it('fails on a non-2xx response', async () => {
    const result = await fetchImageBuffer(
      'https://x/pic.png',
      fakeFetch(fakeResponse(false, 'image/png')),
    )
    expect(result.ok).toBe(false)
    expect(result.error).toBe('تعذر تحميل الصورة من الرابط')
  })

  it('fails when the content type is not an image', async () => {
    const result = await fetchImageBuffer(
      'https://x/pic',
      fakeFetch(fakeResponse(true, 'text/html')),
    )
    expect(result.ok).toBe(false)
    expect(result.error).toBe('الرابط لا يشير إلى صورة')
  })

  it('fails when the content type header is missing', async () => {
    const result = await fetchImageBuffer('https://x/pic', fakeFetch(fakeResponse(true, null)))
    expect(result.ok).toBe(false)
    expect(result.error).toBe('الرابط لا يشير إلى صورة')
  })

  it('fails on an empty payload', async () => {
    const result = await fetchImageBuffer(
      'https://x/pic',
      fakeFetch(fakeResponse(true, 'image/png', 0)),
    )
    expect(result.ok).toBe(false)
    expect(result.error).toBe('الملف الذي تم تحميله فارغ')
  })

  it('fails on oversized images', async () => {
    const result = await fetchImageBuffer(
      'https://x/pic',
      fakeFetch(fakeResponse(true, 'image/png', MAX_IMAGE_BYTES + 1)),
    )
    expect(result.ok).toBe(false)
    expect(result.error).toBe('حجم الصورة يتجاوز 2MB')
  })

  it('swallows network errors', async () => {
    const broken = (async () => {
      throw new Error('boom')
    }) as unknown as typeof fetch
    const result = await fetchImageBuffer('https://x/pic', broken)
    expect(result.ok).toBe(false)
    expect(result.error).toBe('تعذر الوصول إلى الرابط')
  })
})
