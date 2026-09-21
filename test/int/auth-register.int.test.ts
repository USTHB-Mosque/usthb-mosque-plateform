import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import sharp from 'sharp'

import { getTestPayload, resetDatabase } from '../setup-integration'
import { clearNextContext, getLastSetCookieOptions } from '../lib/next-stubs'

import type { Payload } from 'payload'
import { register } from '@/features/auth/server/register'
import type { User } from '@/payload-types'

// Payload validates uploads against the file's real content (file-type reads
// magic bytes), so the test documents must be actual PNGs, not zero bytes.
async function pngFileBytes(padBytes = 0): Promise<ArrayBuffer> {
  const image = await sharp({
    create: { width: 1, height: 1, channels: 3, background: { r: 0, g: 0, b: 0 } },
  })
    .png()
    .toBuffer()
  const padded = padBytes > 0 ? Buffer.concat([image, Buffer.alloc(padBytes)]) : image
  const out = new ArrayBuffer(padded.length)
  new Uint8Array(out).set(padded)
  return out
}

async function pngFile(name = 'certificat.png', padBytes = 0): Promise<File> {
  const bytes = await pngFileBytes(padBytes)
  return new File([bytes], name, { type: 'image/png' })
}

class FailingFile extends File {
  constructor(
    chunks: BlobPart[],
    name: string,
    options: FilePropertyBag,
    private rejection: unknown,
  ) {
    super(chunks, name, options)
  }

  arrayBuffer(): Promise<ArrayBuffer> {
    return Promise.reject(this.rejection)
  }
}

function failingFile(name: string, rejection: unknown): File {
  return new FailingFile([], name, { type: 'image/png' }, rejection)
}

describe('register', () => {
  let payload: Payload

  beforeEach(async () => {
    payload = await getTestPayload()
    await resetDatabase()
    clearNextContext()
  })

  afterAll(async () => {
    await payload.db.destroy?.()
  })

  it('creates a pending, consented user and a private, owner-scoped media doc with a random filename', async () => {
    const file = await pngFile('attestation-inscription.png')

    const { user, error } = await register({
      email: 'student@usthb.dz',
      password: 'Str0ngPass!123',
      fullName: 'Étudiant USTHB',
      consentGiven: true,
      verificationDocument: file,
    })

    expect(error).toBeUndefined()
    expect(user).toBeDefined()
    expect(user?.role).toBe('user')
    expect(user?.verificationStatus).toBe('pending_verification')
    expect(user?.consentGiven).toBe(true)
    expect(user?.consentTimestamp).toBeTruthy()

    const media = await payload.find({
      collection: 'media',
      where: { owner: { equals: user?.id } },
      overrideAccess: true,
    })
    expect(media.totalDocs).toBe(1)

    const doc = media.docs[0]
    expect(doc.isPrivate).toBe(true)
    expect(doc.filename).toMatch(/^verification-[0-9a-f-]+\.png$/)
    // The filename must not leak the student's identity.
    expect(doc.filename).not.toContain('student')
  })

  it('logs the user in and sets the session cookie', async () => {
    const { user } = await register({
      email: 'student2@usthb.dz',
      password: 'Str0ngPass!123',
      fullName: 'Étudiant 2',
      consentGiven: true,
      verificationDocument: await pngFile(),
    })

    expect(user).toBeDefined()
    const cookie = getLastSetCookieOptions('payload-token')
    expect(cookie?.value).toBeTruthy()
  })

  it('rejects registration without consent', async () => {
    const { user, error } = await register({
      email: 'no-consent@usthb.dz',
      password: 'Str0ngPass!123',
      fullName: 'No Consent',
      consentGiven: false,
      verificationDocument: await pngFile(),
    })

    expect(user).toBeUndefined()
    expect(error?.code).toBe('CONSENT_REQUIRED')
  })

  it('rejects an unsupported file extension', async () => {
    const file = await pngFile('certificat.exe')

    const { user, error } = await register({
      email: 'bad-ext@usthb.dz',
      password: 'Str0ngPass!123',
      fullName: 'Bad Ext',
      consentGiven: true,
      verificationDocument: file,
    })

    expect(user).toBeUndefined()
    expect(error?.code).toBe('FILE_INVALID')
    expect(error?.field).toBe('schoolCertificate')
  })

  it('rejects an unsupported mime type', async () => {
    const bytes = await pngFileBytes()
    const file = new File([bytes], 'certificat.pdf', { type: 'text/html' })

    const { user, error } = await register({
      email: 'bad-mime@usthb.dz',
      password: 'Str0ngPass!123',
      fullName: 'Bad Mime',
      consentGiven: true,
      verificationDocument: file,
    })

    expect(user).toBeUndefined()
    expect(error?.code).toBe('FILE_INVALID')
  })

  it('rejects a file over 5MB', async () => {
    const file = await pngFile('big.png', 5 * 1024 * 1024 + 1)

    const { user, error } = await register({
      email: 'big-file@usthb.dz',
      password: 'Str0ngPass!123',
      fullName: 'Big File',
      consentGiven: true,
      verificationDocument: file,
    })

    expect(user).toBeUndefined()
    expect(error?.code).toBe('FILE_TOO_LARGE')
  })

  it('rejects a duplicate email', async () => {
    await register({
      email: 'taken@usthb.dz',
      password: 'Str0ngPass!123',
      fullName: 'Taken',
      consentGiven: true,
      verificationDocument: await pngFile(),
    })
    clearNextContext()

    const { user, error } = await register({
      email: 'taken@usthb.dz',
      password: 'Str0ngPass!123',
      fullName: 'Duplicate',
      consentGiven: true,
      verificationDocument: await pngFile(),
    })

    expect(user).toBeUndefined()
    expect(error?.code).toBe('EMAIL_TAKEN')
    expect(error?.field).toBe('email')
  })

  it('rejects a document without a file extension', async () => {
    const bytes = await pngFileBytes()
    const file = new File([bytes], 'noext', { type: 'image/png' })

    const { user, error } = await register({
      email: 'no-ext@usthb.dz',
      password: 'Str0ngPass!123',
      fullName: 'No Ext',
      consentGiven: true,
      verificationDocument: file,
    })

    expect(user).toBeUndefined()
    expect(error?.code).toBe('FILE_INVALID')
  })

  it('reports a generic server error for a failed user create', async () => {
    const { user, error } = await register({
      email: 'weak-password@usthb.dz',
      password: 'x',
      fullName: 'Weak Password',
      consentGiven: true,
      verificationDocument: await pngFile(),
    })

    expect(user).toBeUndefined()
    expect(error?.code).toBe('SERVER_ERROR')
  })

  it('treats an InvalidKey-named upload failure as UPLOAD_FAILED', async () => {
    const rejection = new Error('S3 rejected the object')
    rejection.name = 'InvalidKey'

    const { user, error } = await register({
      email: 'named-upload-error@usthb.dz',
      password: 'Str0ngPass!123',
      fullName: 'Named Upload Error',
      consentGiven: true,
      verificationDocument: failingFile('certificat.png', rejection),
    })

    expect(user).toBeUndefined()
    expect(error?.code).toBe('UPLOAD_FAILED')
  })

  it('treats a generic upload failure as UPLOAD_FAILED', async () => {
    const { user, error } = await register({
      email: 'generic-upload-error@usthb.dz',
      password: 'Str0ngPass!123',
      fullName: 'Generic Upload Error',
      consentGiven: true,
      verificationDocument: failingFile('certificat.png', new Error('bucket upload failed')),
    })

    expect(user).toBeUndefined()
    expect(error?.code).toBe('UPLOAD_FAILED')
  })

  it('treats a non-error rejection as SERVER_ERROR and rolls the user back', async () => {
    const { user, error } = await register({
      email: 'weird-rejection@usthb.dz',
      password: 'Str0ngPass!123',
      fullName: 'Weird Rejection',
      consentGiven: true,
      verificationDocument: failingFile('certificat.png', { upload: true }),
    })

    expect(user).toBeUndefined()
    expect(error?.code).toBe('SERVER_ERROR')

    const found = await payload.find({
      collection: 'users',
      where: { email: { equals: 'weird-rejection@usthb.dz' } },
      overrideAccess: true,
    })
    expect(found.totalDocs).toBe(0)
  })

  it('rolls the created user back when the upload fails', async () => {
    const { user, error } = await register({
      email: 'rollback@usthb.dz',
      password: 'Str0ngPass!123',
      fullName: 'Rollback',
      consentGiven: true,
      verificationDocument: failingFile('certificat.png', new Error('InvalidKey')),
    })

    expect(user).toBeUndefined()
    expect(error?.code).toBe('UPLOAD_FAILED')

    const found = await payload.find({
      collection: 'users',
      where: { email: { equals: 'rollback@usthb.dz' } },
      overrideAccess: true,
    })
    expect(found.totalDocs).toBe(0)
  })
})
