'use server'
import config from '@/payload.config'
import { getPayload } from 'payload'
import { User } from '@/payload-types'
import { setPayloadTokenCookie } from '@/lib/auth'
import { AuthError } from '@/lib/auth-errors'

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

function buildSafeFileKey(email: string, originalName: string, timestamp: number): string {
  const ext = getFileExtension(originalName) || 'pdf'
  const safeEmail = email.replace(/[^a-zA-Z0-9@.]/g, '').toLowerCase() || 'user'
  return `verification-${safeEmail}-${timestamp}.${ext}`
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

    const safeFileName = buildSafeFileKey(email, verificationDocument.name, Date.now())

    const mediaDoc = await payload.create({
      collection: 'media',
      draft: false,
      data: {
        alt: `وثيقة تحقق: ${verificationDocument.name}`,
      },
      filePath: undefined,
      file: {
        data: Buffer.from(await verificationDocument.arrayBuffer()),
        name: safeFileName,
        mimetype: verificationDocument.type,
        size: verificationDocument.size,
      },
    })

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
        verificationDocument: mediaDoc.id,
        verificationStatus: 'pending_verification',
        consentGiven: true,
        consentTimestamp: new Date().toISOString(),
      },
    })

    const { token } = await payload.login({
      collection: 'users',
      data: {
        email,
        password,
      },
    })

    if (token) {
      await setPayloadTokenCookie(token)
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
