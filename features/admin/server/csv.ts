'use server'

import { revalidatePath } from 'next/cache'

import { getAdminCtx, getStaffCtx } from './ctx'
import { fetchImageBuffer, parseBooksCsv, parseUsersCsv } from './csv-core'

import type { BookSeed, CsvPreviewResult, UserSeed } from './csv-core'

export type { CsvPreviewResult } from './csv-core'

export interface CsvImportError {
  row: number
  message: string
}

export type CsvCommitResult =
  { ok: true; created: number } | { ok: false; errors: CsvImportError[] }

const MAX_FILE_ROWS = 2000

async function readCsv(file: File): Promise<string> {
  const text = await file.text()
  if (text.length > 2 * 1024 * 1024) throw new Error('الملف كبير جداً — الحد الأقصى 2MB')
  return text
}

function describeCreateError(error: unknown, isUser: boolean): string {
  const message = error instanceof Error ? error.message : String(error)
  if (/duplicate|unique|The following field is invalid/i.test(message)) {
    return isUser ? 'البريد الإلكتروني مستخدم بالفعل' : 'رقم ISBN مستخدم بالفعل'
  }
  if (/access|forbidden|not allowed|permission|صلاحية/i.test(message)) {
    return 'ليست لديك صلاحية تنفيذ هذه العملية'
  }
  if (message.includes('تصنيف غير معروف')) return message
  return 'تعذر حفظ هذا السطر'
}

export async function previewBooksImport(file: File): Promise<CsvPreviewResult> {
  await getStaffCtx()
  return parseBooksCsv(await readCsv(file))
}

export async function previewUsersImport(file: File): Promise<CsvPreviewResult> {
  await getAdminCtx()
  return parseUsersCsv(await readCsv(file))
}

export async function commitBooksImport(file: File): Promise<CsvCommitResult> {
  const { payload, user, req } = await getStaffCtx()

  const parsed = parseBooksCsv(await readCsv(file))
  if (parsed.invalidCount > 0) return { ok: false, errors: parsed.errors }

  const seeds = parsed.rows.map((row) => row.data) as BookSeed[]
  if (seeds.length === 0)
    return { ok: false, errors: [{ row: 0, message: 'الملف لا يحتوي على أي صفوف' }] }
  if (seeds.length > MAX_FILE_ROWS) {
    return { ok: false, errors: [{ row: 0, message: `الحد الأقصى ${MAX_FILE_ROWS} سطر في الملف` }] }
  }

  const imageJobs = await Promise.all(
    seeds.map((seed) => (seed.imageUrl ? fetchImageBuffer(seed.imageUrl) : Promise.resolve(null))),
  )
  const imageErrors = seeds.flatMap((seed, index) => {
    const job = imageJobs[index]
    if (seed.imageUrl && job && !job.ok) {
      return [{ row: index + 2, message: `تعذر استيراد صورة: ${job.error}` }]
    }
    return []
  })
  if (imageErrors.length > 0) return { ok: false, errors: imageErrors }

  const transactionID = await payload.db.beginTransaction()
  const txReq = transactionID == null ? req : { ...req, transactionID }
  const errors: CsvImportError[] = []

  try {
    for (let index = 0; index < seeds.length; index += 1) {
      const seed = seeds[index]
      const job = imageJobs[index]
      try {
        let imageId: number | undefined
        if (job && job.ok && job.buffer) {
          const media = await payload.create({
            collection: 'media',
            data: { alt: seed.title },
            file: {
              data: job.buffer,
              mimetype: job.mimetype ?? 'image/png',
              name: `csv-${Date.now()}-${index}.png`,
              size: job.buffer.byteLength,
            },
            req: txReq,
            overrideAccess: false,
          })
          imageId = media.id
        }
        const { imageUrl: _imageUrl, ...bookData } = seed
        await payload.create({
          collection: 'books',
          data: { ...bookData, image: imageId },
          req: txReq,
          overrideAccess: false,
        })
      } catch (error) {
        errors.push({ row: index + 2, message: describeCreateError(error, false) })
        // Payload rolls back and drops the transaction session on the failed
        // create, so any later row would commit outside our transaction.
        break
      }
    }

    if (errors.length > 0) {
      if (transactionID != null) await payload.db.rollbackTransaction(transactionID)
      return { ok: false, errors }
    }
    if (transactionID != null) await payload.db.commitTransaction(transactionID)
  } catch (error) {
    if (transactionID != null) await payload.db.rollbackTransaction(transactionID)
    return {
      ok: false,
      errors: errors.length > 0 ? errors : [{ row: 0, message: 'تعذر استيراد الملف' }],
    }
  }

  revalidatePath('/admin-panel/library')
  return { ok: true, created: seeds.length }
}

export async function commitUsersImport(file: File): Promise<CsvCommitResult> {
  const { payload, user, req } = await getAdminCtx()

  const parsed = parseUsersCsv(await readCsv(file))
  if (parsed.invalidCount > 0) return { ok: false, errors: parsed.errors }

  const seeds = parsed.rows.map((row) => row.data) as UserSeed[]
  if (seeds.length === 0)
    return { ok: false, errors: [{ row: 0, message: 'الملف لا يحتوي على أي صفوف' }] }
  if (seeds.length > MAX_FILE_ROWS) {
    return { ok: false, errors: [{ row: 0, message: `الحد الأقصى ${MAX_FILE_ROWS} سطر في الملف` }] }
  }

  const transactionID = await payload.db.beginTransaction()
  const txReq = transactionID == null ? req : { ...req, transactionID }
  const errors: CsvImportError[] = []

  try {
    for (let index = 0; index < seeds.length; index += 1) {
      const seed = seeds[index]
      try {
        await payload.create({
          collection: 'users',
          data: {
            email: seed.email,
            password: seed.password,
            fullName: seed.fullName,
            phone: seed.phone,
            faculty: seed.faculty,
            speciality: seed.speciality,
            studyYear: seed.studyYear,
            situation: seed.situation,
            role: seed.role ?? 'user',
            verificationStatus: seed.verificationStatus,
            consentGiven: true,
            consentTimestamp: new Date().toISOString(),
          },
          req: txReq,
          overrideAccess: false,
        })
      } catch (error) {
        errors.push({ row: index + 2, message: describeCreateError(error, true) })
        // Payload rolls back and drops the transaction session on the failed
        // create, so any later row would commit outside our transaction.
        break
      }
    }

    if (errors.length > 0) {
      if (transactionID != null) await payload.db.rollbackTransaction(transactionID)
      return { ok: false, errors }
    }
    if (transactionID != null) await payload.db.commitTransaction(transactionID)
  } catch (error) {
    if (transactionID != null) await payload.db.rollbackTransaction(transactionID)
    return {
      ok: false,
      errors: errors.length > 0 ? errors : [{ row: 0, message: 'تعذر استيراد الملف' }],
    }
  }

  revalidatePath('/admin-panel/users')
  return { ok: true, created: seeds.length }
}
