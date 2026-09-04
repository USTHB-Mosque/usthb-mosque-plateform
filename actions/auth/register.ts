'use server'
import config from '@/payload.config'
import { getPayload } from 'payload'
import { User } from '@/payload-types'
import { setPayloadTokenCookie } from '@/lib/auth'
import { AuthError } from '@/lib/auth-errors'
import { randomUUID } from 'crypto'

interface RegisterResult {
  user: User | undefined
  error?: AuthError
}

interface RegisterParams {
  email: string
  password: string
  fullName: string
  phone?: string
  faculty?: string
  studyYear?: string
  verificationDocument: File
  consentGiven: boolean
}

const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png']
const ALLOWED_MIME_PREFIXES = ['image/jpeg', 'image/png', 'application/pdf']
const MAX_FILE_SIZE = 5 * 1024 * 1024

function getFileExtension(name: string): string | null {
  const match = name.match(/\.([a-zA-Z0-9]+)$/)
  return match ? match[1].toLowerCase() : null
}

function buildSafeFileKey(originalName: string): string {
  const ext = getFileExtension(originalName) || 'pdf'
  // Random, not derived from the user's email: a verification document's filename
  // must not be guessable, since it is served from a path an attacker could enumerate.
  return `verification-${randomUUID()}.${ext}`
}

export const register = async (params: RegisterParams): Promise<RegisterResult> => {
  const {
    email,
    password,
    fullName,
    phone,
    faculty,
    studyYear,
    verificationDocument,
    consentGiven,
  } = params

  if (!consentGiven) {
    return { user: undefined, error: { code: 'CONSENT_REQUIRED' } }
  }

  const ext = getFileExtension(verificationDocument.name)
  const isSupportedExt = ext ? ALLOWED_EXTENSIONS.includes(ext) : false
  const isSupportedMime = ALLOWED_MIME_PREFIXES.some((prefix) =>
    verificationDocument.type.startsWith(prefix),
  )

  if (!isSupportedExt || !isSupportedMime) {
    return { user: undefined, error: { code: 'FILE_INVALID', field: 'schoolCertificate' } }
  }

  if (verificationDocument.size > MAX_FILE_SIZE) {
    return { user: undefined, error: { code: 'FILE_TOO_LARGE', field: 'schoolCertificate' } }
  }

  const payload = await getPayload({ config })

  try {
    const existingUsers = await payload.find({
      collection: 'users',
      where: {
        email: { equals: email },
      },
    })

    if (existingUsers.docs.length > 0) {
      return { user: undefined, error: { code: 'EMAIL_TAKEN', field: 'email' } }
    }

    const user = await payload.create({
      collection: 'users',
      draft: false,
      data: {
        email,
        password,
        fullName,
        phone,
        faculty,
        studyYear: studyYear as '1' | '2' | '3' | '4' | '5' | undefined,
        role: 'user',
        verificationStatus: 'pending_verification',
        consentGiven: true,
        consentTimestamp: new Date().toISOString(),
      },
    })

    try {
      const safeFileName = buildSafeFileKey(verificationDocument.name)

      const mediaDoc = await payload.create({
        collection: 'media',
        draft: false,
        data: {
          alt: `وثيقة تحقق: ${verificationDocument.name}`,
          isPrivate: true,
          owner: user.id,
        },
        filePath: undefined,
        file: {
          data: Buffer.from(await verificationDocument.arrayBuffer()),
          name: safeFileName,
          mimetype: verificationDocument.type,
          size: verificationDocument.size,
        },
      })

      await payload.update({
        collection: 'users',
        id: user.id,
        data: { verificationDocument: mediaDoc.id },
      })
    } catch (uploadError) {
      // The account is useless without its verification document, so do not
      // leave an orphaned pending_verification user behind.
      await payload.delete({ collection: 'users', id: user.id }).catch(() => {})
      throw uploadError
    }

    const { token, exp } = await payload.login({
      collection: 'users',
      data: {
        email,
        password,
      },
    })

    if (token) {
      await setPayloadTokenCookie(token, exp)
    }
    return { user: user as User }
  } catch (error) {
    const msg = error instanceof Error ? error.message : ''
    const isUploadError =
      error &&
      typeof error === 'object' &&
      'name' in error &&
      (error.name === 'InvalidKey' || msg.includes('InvalidKey') || msg.includes('upload'))

    console.error('Registration error:', error)
    return {
      user: undefined,
      error: { code: isUploadError ? 'UPLOAD_FAILED' : 'SERVER_ERROR' },
    }
  }
}
