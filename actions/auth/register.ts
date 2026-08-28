'use server'
import config from '@/payload.config'
import { getPayload } from 'payload'
import { User } from '@/payload-types'
import { setPayloadTokenCookie } from '@/lib/auth'

interface RegisterResult {
  user: User | undefined
  token?: string
  error?: string
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
    return { user: undefined, error: 'يجب الموافقة على شروط الخصوصية' }
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
      return { user: undefined, error: 'البريد الإلكتروني مستخدم بالفعل' }
    }

    const mediaDoc = await payload.create({
      collection: 'media',
      draft: false,
      data: {
        alt: `Verification document for ${fullName}`,
      },
      filePath: undefined,
      file: {
        data: Buffer.from(await verificationDocument.arrayBuffer()),
        name: verificationDocument.name,
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
    return { user: user as User, token }
  } catch (error) {
    console.error('Registration error:', error)
    return { user: undefined, error: 'حدث خطأ أثناء إنشاء الحساب' }
  }
}
