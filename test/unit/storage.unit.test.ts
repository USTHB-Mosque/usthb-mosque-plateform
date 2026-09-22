import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@payloadcms/storage-s3', () => ({
  s3Storage: vi.fn(() => 's3-plugin'),
}))
vi.mock('@payloadcms/storage-vercel-blob', () => ({
  vercelBlobStorage: vi.fn(() => 'blob-plugin'),
}))

import { getStoragePlugin } from '@/storage'
import { s3Storage } from '@payloadcms/storage-s3'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'

const s3StorageMock = vi.mocked(s3Storage)
const vercelBlobStorageMock = vi.mocked(vercelBlobStorage)

// Storage selection is env-driven; tests mutate a copy and restore it after.
const originalEnv = { ...process.env }

// NODE_ENV is typed read-only on NodeJS.ProcessEnv, so go through a writable view.
const env = process.env as unknown as Record<string, string | undefined>

function setEnv(overrides: Record<string, string | undefined>) {
  for (const key of [
    'NODE_ENV',
    'S3_ACCESS_KEY_ID',
    'S3_SECRET_ACCESS_KEY',
    'BLOB_READ_WRITE_TOKEN',
    'S3_BUCKET',
    'S3_REGION',
    'S3_ENDPOINT',
  ]) {
    if (key in overrides) {
      env[key] = overrides[key]
    } else {
      delete env[key]
    }
  }
}

describe('getStoragePlugin', () => {
  beforeEach(() => {
    s3StorageMock.mockClear()
    vercelBlobStorageMock.mockClear()
  })

  afterEach(() => {
    setEnv(originalEnv)
  })

  it('uses the s3 adapter when S3 credentials are configured, whatever the environment', () => {
    for (const nodeEnv of ['development', 'production']) {
      setEnv({ NODE_ENV: nodeEnv, S3_ACCESS_KEY_ID: 'key', S3_SECRET_ACCESS_KEY: 'secret' })

      expect(getStoragePlugin()).toBe('s3-plugin')
      expect(s3StorageMock).toHaveBeenCalledWith(
        expect.objectContaining({
          collections: { media: { prefix: 'media' } },
          bucket: 'media',
          config: expect.objectContaining({ forcePathStyle: true }),
        }),
      )
    }
  })

  it('falls back to vercel blob when no S3 credentials but a blob token exists', () => {
    setEnv({ NODE_ENV: 'production', BLOB_READ_WRITE_TOKEN: 'blob-token' })

    expect(getStoragePlugin()).toBe('blob-plugin')
    expect(vercelBlobStorageMock).toHaveBeenCalledWith({
      collections: { media: true },
      token: 'blob-token',
    })
  })

  it('throws when neither S3 credentials nor a blob token are available', () => {
    setEnv({ NODE_ENV: 'production' })

    expect(() => getStoragePlugin()).toThrow('S3_ACCESS_KEY_ID')
  })
})
