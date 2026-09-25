import Papa from 'papaparse'

import type { Book, User } from '@/payload-types'

import { bookCategoriesConfig, bookTypesConfig, BookCategory } from '@/utils/constants/books'
import { languagesConfig } from '@/utils/constants/data'
import { userSituationsConfigArray } from '@/utils/constants/users'
import { plainTextToLexical } from '@/utils/rich-text'

export interface RowError {
  row: number
  message: string
}

interface CsvPreviewRow {
  row: number
  values: Record<string, string>
}

export interface CsvPreviewColumn {
  rowIndex: number
  errors: string[]
  data?: BookSeed | UserSeed
}

export interface CsvPreviewResult {
  headers: string[]
  total: number
  validCount: number
  invalidCount: number
  errors: RowError[]
  preview: CsvPreviewRow[]
  /** Parsed seeds for the commit actions; always empty when invalid rows exist. */
  rows: CsvPreviewColumn[]
}

export interface BookSeed {
  title: string
  author: string
  type: Book['type']
  category: NonNullable<Book['category']>
  shortDescription: string
  longDescription?: NonNullable<Book['longDescription']>
  publisher?: string
  language?: Book['language']
  pageCount?: number
  isbn?: string
  editionNumber?: string
  publishDate?: string
  totalBooks?: number
  availableBooks?: number
  location?: string
  imageUrl?: string
}

export interface UserSeed {
  email: string
  password: string
  fullName?: string
  phone?: string
  faculty?: string
  speciality?: string
  studyYear?: User['studyYear']
  situation?: User['situation']
  role?: 'user' | 'librarian' | 'admin'
  verificationStatus?: User['verificationStatus']
}

export interface ParsedBookRow {
  rowIndex: number
  errors: string[]
  data?: BookSeed
}

export interface ParsedUserRow {
  rowIndex: number
  errors: string[]
  data?: UserSeed
}

const BOOK_COLUMNS = [
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
] as const

const USER_COLUMNS = [
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
] as const

const REQUIRED_BOOK_COLUMNS = ['title', 'author', 'type', 'shortDescription'] as const
const REQUIRED_USER_COLUMNS = ['email', 'password'] as const

const ROLE_LABELS: Record<string, string> = {
  user: 'عضو',
  librarian: 'أمين مكتبة',
  admin: 'مشرف',
}

const VERIFICATION_LABELS: Record<string, string> = {
  pending_verification: 'بانتظار التحقق',
  verified: 'مُتحقق منه',
  rejected: 'مرفوض',
}

export const MAX_CSV_BYTES = 2 * 1024 * 1024
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024

function normalizeHeaderKey(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[\s_\-/]+/g, '')
}

/** `Image Url` -> `imageUrl`; unknown columns are dropped. */
function canonicalColumns(rawHeaders: string[]): { aliases: Map<string, string>; found: string[] } {
  const aliases = new Map<string, string>()
  const found: string[] = []
  const all = new Map<string, string>([
    ...BOOK_COLUMNS.map((c) => [normalizeHeaderKey(c), c] as const),
    ...USER_COLUMNS.map((c) => [normalizeHeaderKey(c), c] as const),
  ])
  for (const raw of rawHeaders) {
    const canonical = all.get(normalizeHeaderKey(raw))
    if (canonical) {
      aliases.set(canonical, raw)
      found.push(canonical)
    }
  }
  return { aliases, found }
}

/**
 * Parses CSV text into records keyed by canonical column names. Headers are
 * matched case-insensitively and ignoring spaces/underscores/dashes so the
 * exact workbook labels do not matter.
 */
export function parseCsvText(text: string): {
  headers: string[]
  rows: Record<string, string>[]
  /** Canonical names of the columns that matched known aliases. */
  found: string[]
  error?: string
} {
  if (text.length > MAX_CSV_BYTES) {
    return {
      headers: [],
      rows: [],
      found: [],
      error: 'الملف كبير جداً — الحد الأقصى 2MB',
    }
  }

  const stripped = text.replace(/^\uFEFF/, '')
  const parsed = Papa.parse<Record<string, string>>(stripped, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h: string) => h.trim(),
    transform: (value: string) => value.trim(),
  })

  const rawRecords = parsed.data
  const first = rawRecords[0]
  const headers = first ? Object.keys(first) : []

  const { aliases, found } = canonicalColumns(headers)

  const rows = rawRecords.map((record) => {
    const row: Record<string, string> = {}
    for (const [dataKey, rawKey] of aliases.entries()) {
      row[dataKey] = record[rawKey]
    }
    return row
  })

  return { headers, rows, found }
}

function recordToLookup(
  pairs: ReadonlyArray<{ value: string; label: string }>,
): (input: string) => string | undefined {
  const byValue = new Map(pairs.map((p) => [p.value, p.value]))
  const byLabel = new Map(pairs.map((p) => [p.label.trim(), p.value]))
  return (input: string) => byValue.get(input) ?? byLabel.get(input)
}

const normalizeBookType = recordToLookup(
  Object.entries(bookTypesConfig).map(([value, label]) => ({ value, label })),
)
const normalizeCategory = recordToLookup(
  Object.entries(bookCategoriesConfig).map(([value, label]) => ({ value, label })),
)
const normalizeLanguage = recordToLookup(
  Object.entries(languagesConfig).map(([value, label]) => ({ value, label })),
)
const normalizeSituation = recordToLookup(userSituationsConfigArray)

function empty(value: string | undefined): boolean {
  return value == null || value === ''
}

function parseOptionalNumber(value: string, label: string, row: string[]): number | undefined {
  if (empty(value)) return undefined
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0) {
    row.push(`${label} يجب أن يكون رقماً غير سالب`)
    return undefined
  }
  return number
}

function splitMulti(value: string): string[] {
  return value
    .split(/[،,;/]/)
    .map((part) => part.trim())
    .filter((part) => part !== '')
}

function detectInFileDuplicates(
  values: Array<{ rowIndex: number; key: string }>,
): Map<string, number[]> {
  const byKey = new Map<string, number[]>()
  for (const { rowIndex, key } of values) {
    const list = byKey.get(key)
    if (list) list.push(rowIndex)
    else byKey.set(key, [rowIndex])
  }
  const duplicates = new Map<string, number[]>()
  for (const [key, rows] of byKey) {
    if (rows.length > 1) duplicates.set(key, rows)
  }
  return duplicates
}

function parseBooksRow(record: Record<string, string>, rowIndex: number): ParsedBookRow {
  const errors: string[] = []

  if (empty(record.title)) errors.push('العنوان مطلوب')
  if (empty(record.author)) errors.push('المؤلف مطلوب')

  const typeTokens = splitMulti(record.type)
  if (typeTokens.length === 0) errors.push('التصنيف مطلوب')
  const types = typeTokens
    .map((token) => normalizeBookType(token))
    .filter((t): t is string => t !== undefined)
  const unknownTypes = typeTokens.filter((token) => !normalizeBookType(token))
  for (const unknown of unknownTypes) errors.push(`تصنيف غير معروف: "${unknown}"`)

  if (empty(record.shortDescription)) errors.push('الوصف المختصر مطلوب')

  const pageCount = parseOptionalNumber(record.pageCount, 'عدد الصفحات', errors)
  const totalBooks = parseOptionalNumber(record.totalBooks, 'إجمالي الكتب', errors)
  const availableBooks = parseOptionalNumber(record.availableBooks, 'الكتب المتوفرة', errors)

  if (record.publishDate && !/^\d{4}-\d{2}-\d{2}$/.test(record.publishDate)) {
    errors.push('تاريخ النشر يجب أن يكون بصيغة YYYY-MM-DD')
  }

  const category = record.category ? normalizeCategory(record.category) : BookCategory.Religious
  if (record.category && !category) errors.push(`فئة غير معروفة: "${record.category}"`)

  const language = record.language ? normalizeLanguage(record.language) : undefined
  if (record.language && !language) errors.push(`لغة غير معروفة: "${record.language}"`)

  if (errors.length > 0) return { rowIndex, errors }

  return {
    rowIndex,
    errors: [],
    data: {
      title: record.title,
      author: record.author,
      type: types as Book['type'],
      category: category as NonNullable<Book['category']>,
      shortDescription: record.shortDescription,
      longDescription: record.longDescription
        ? (plainTextToLexical(record.longDescription) as NonNullable<Book['longDescription']>)
        : undefined,
      publisher: record.publisher || undefined,
      language: (language || undefined) as Book['language'],
      pageCount,
      isbn: record.isbn || undefined,
      editionNumber: record.editionNumber || undefined,
      publishDate: record.publishDate || undefined,
      totalBooks,
      availableBooks,
      location: record.location || undefined,
      imageUrl: record.imageUrl || undefined,
    },
  }
}

export function parseBooksCsv(text: string): CsvPreviewResult {
  const { headers, rows, found, error } = parseCsvText(text)

  const missing = REQUIRED_BOOK_COLUMNS.filter((column) => !found.includes(column))
  if (error || missing.length > 0) {
    const firstError = error ?? `أعمدة مفقودة: ${missing.join('، ')}`
    return {
      headers,
      total: rows.length,
      validCount: 0,
      invalidCount: rows.length,
      errors: rows.map((_, index) => ({ row: index + 2, message: firstError })),
      preview: [],
      rows: [],
    }
  }

  const parsed = rows.map((record, index) => parseBooksRow(record, index + 2))

  const isbns = parsed.flatMap((p) =>
    p.data?.isbn ? [{ rowIndex: p.rowIndex, key: p.data.isbn }] : [],
  )
  const duplicateIsbns = detectInFileDuplicates(isbns)

  const allErrors = parsed.flatMap((p) => {
    const rowErrors = [...p.errors]
    if (p.data?.isbn) {
      const rows = duplicateIsbns.get(p.data.isbn)
      if (rows && rows.length > 1) {
        const withoutSelf = rows.filter((r) => r !== p.rowIndex)
        rowErrors.push(`ISBN مكرر في نفس الملف مع السطر ${withoutSelf.join('، ')}: ${p.data.isbn}`)
      }
    }
    return rowErrors.map((message) => ({ row: p.rowIndex, message }))
  })

  const errors = allErrors.length > 0 ? mergeRowErrors(allErrors) : []
  const invalidRows = new Set(allErrors.map((error) => error.row))
  const validCount = parsed.filter((p) => p.data && !invalidRows.has(p.rowIndex)).length

  return {
    headers,
    total: rows.length,
    validCount,
    invalidCount: rows.length - validCount,
    errors,
    preview: rows.slice(0, 8).map((record, index) => ({
      row: index + 2,
      values: record,
    })),
    rows: parsed,
  }
}

function mergeRowErrors(errors: RowError[]): RowError[] {
  const byRow = new Map<number, string[]>()
  for (const error of errors) {
    const list = byRow.get(error.row)
    if (list) list.push(error.message)
    else byRow.set(error.row, [error.message])
  }
  return [...byRow.entries()]
    .sort(([a], [b]) => a - b)
    .map(([row, messages]) => ({ row, message: messages.join('؛ ') }))
}

const normalizeUserRole = (input: string): string | undefined => {
  if (input === 'user' || input === 'member' || input === 'عضو') return 'user'
  if (input === 'librarian' || input === 'أمين مكتبة') return 'librarian'
  if (input === 'admin' || input === 'مشرف') return 'admin'
  return undefined
}

const normalizeVerification = (input: string): string | undefined => {
  if (input === 'pending' || input === 'pending_verification') return 'pending_verification'
  if (input === 'verified' || input === 'مُتحقق' || input === 'مُتحقق منه') return 'verified'
  if (input === 'rejected' || input === 'مرفوض') return 'rejected'
  return undefined
}

function parseUsersRow(record: Record<string, string>, rowIndex: number): ParsedUserRow {
  const errors: string[] = []

  if (empty(record.email)) errors.push('البريد الإلكتروني مطلوب')
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)) {
    errors.push(`بريد إلكتروني غير صالح: "${record.email}"`)
  }

  if (empty(record.password)) errors.push('كلمة المرور مطلوبة')
  else if (record.password.length < 6) errors.push('كلمة المرور يجب أن تكون 6 أحرف على الأقل')

  const studyYear = record.studyYear || undefined
  if (studyYear && !['1', '2', '3', '4', '5'].includes(studyYear)) {
    errors.push(`سنة الدراسة غير معروفة: "${record.studyYear}"`)
  }

  const situation = record.situation ? normalizeSituation(record.situation) : undefined
  if (record.situation && !situation) errors.push(`الوضعية غير معروفة: "${record.situation}"`)

  const role = record.role ? normalizeUserRole(record.role) : 'user'
  if (record.role && !normalizeUserRole(record.role)) {
    errors.push(`الدور غير معروف: "${record.role}"`)
  }

  const verificationStatus = record.verificationStatus
    ? normalizeVerification(record.verificationStatus)
    : 'pending_verification'
  if (record.verificationStatus && !normalizeVerification(record.verificationStatus)) {
    errors.push(`حالة التحقق غير معروفة: "${record.verificationStatus}"`)
  }

  if (errors.length > 0) return { rowIndex, errors }

  return {
    rowIndex,
    errors: [],
    data: {
      email: record.email,
      password: record.password,
      fullName: record.fullName || undefined,
      phone: record.phone || undefined,
      faculty: record.faculty || undefined,
      speciality: record.speciality || undefined,
      studyYear: studyYear as User['studyYear'],
      situation: situation as User['situation'],
      role: role as 'user' | 'librarian' | 'admin',
      verificationStatus: verificationStatus as User['verificationStatus'],
    },
  }
}

export function parseUsersCsv(text: string): CsvPreviewResult {
  const { headers, rows, found, error } = parseCsvText(text)

  const missing = REQUIRED_USER_COLUMNS.filter((column) => !found.includes(column))
  if (error || missing.length > 0) {
    const firstError = error ?? `أعمدة مفقودة: ${missing.join('، ')}`
    return {
      headers,
      total: rows.length,
      validCount: 0,
      invalidCount: rows.length,
      errors: rows.map((_, index) => ({ row: index + 2, message: firstError })),
      preview: [],
      rows: [],
    }
  }

  const parsed = rows.map((record, index) => parseUsersRow(record, index + 2))

  const emails = parsed.flatMap((p) =>
    p.data?.email ? [{ rowIndex: p.rowIndex, key: p.data.email.toLowerCase() }] : [],
  )
  const duplicateEmails = detectInFileDuplicates(emails)

  const allErrors = parsed.flatMap((p) => {
    const rowErrors = [...p.errors]
    if (p.data?.email) {
      const rows = duplicateEmails.get(p.data.email.toLowerCase())
      if (rows && rows.length > 1) {
        const withoutSelf = rows.filter((r) => r !== p.rowIndex)
        rowErrors.push(`بريد مكرر في نفس الملف مع السطر ${withoutSelf.join('، ')}: ${p.data.email}`)
      }
    }
    return rowErrors.map((message) => ({ row: p.rowIndex, message }))
  })

  const errors = allErrors.length > 0 ? mergeRowErrors(allErrors) : []
  const invalidRows = new Set(allErrors.map((error) => error.row))
  const validCount = parsed.filter((p) => p.data && !invalidRows.has(p.rowIndex)).length

  return {
    headers,
    total: rows.length,
    validCount,
    invalidCount: rows.length - validCount,
    errors,
    preview: rows.slice(0, 8).map((record, index) => ({
      row: index + 2,
      values: record,
    })),
    rows: parsed,
  }
}

export interface ImageFetchResult {
  ok: boolean
  buffer?: Buffer
  mimetype?: string
  error?: string
}

/**
 * Downloads an image URL for the CSV cover. `fetcher` is injectable so the
 * network boundary can be stubbed in unit tests.
 */
export async function fetchImageBuffer(
  url: string,
  fetcher: typeof fetch = fetch,
): Promise<ImageFetchResult> {
  try {
    const response = await fetcher(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
    })
    if (!response.ok) return { ok: false, error: 'تعذر تحميل الصورة من الرابط' }
    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.startsWith('image/')) return { ok: false, error: 'الرابط لا يشير إلى صورة' }
    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.byteLength === 0) return { ok: false, error: 'الملف الذي تم تحميله فارغ' }
    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      return { ok: false, error: 'حجم الصورة يتجاوز 2MB' }
    }
    return { ok: true, buffer, mimetype: contentType }
  } catch {
    return { ok: false, error: 'تعذر الوصول إلى الرابط' }
  }
}

export const csvLabels = {
  bookColumns: BOOK_COLUMNS,
  userColumns: USER_COLUMNS,
  bookTypes: bookTypesConfig,
  bookCategories: bookCategoriesConfig,
  languages: languagesConfig,
  situations: Object.fromEntries(
    userSituationsConfigArray.map((s) => [s.value, s.label]),
  ) as Record<string, string>,
  roles: ROLE_LABELS,
  verificationStatuses: VERIFICATION_LABELS,
}
