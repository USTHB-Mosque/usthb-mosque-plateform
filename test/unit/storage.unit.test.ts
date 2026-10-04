import type { Config as PayloadConfig } from 'payload'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@payloadcms/storage-s3', () => ({
  s3Storage: vi.fn(() => 's3-plugin'),
}))

// The vercel-blob plugin returns an inner config plugin; getStoragePlugin
// wraps it (withPrivateBlobAccess) so the result is a new async plugin.
vi.mock('@payloadcms/storage-vercel-blob', () => ({
  vercelBlobStorage: vi.fn(() => (config: PayloadConfig) => config),
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

const STORAGE_VARS = [
  'NODE_ENV',
  'VERCEL',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
  'BLOB_READ_WRITE_TOKEN',
  'S3_BUCKET',
  'S3_REGION',
  'S3_ENDPOINT',
  'STORAGE_VERCEL_BLOB_BASE_URL',
]

function setEnv(overrides: Record<string, string | undefined>) {
  for (const key of STORAGE_VARS) {
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

  it('falls back to vercel blob with private access when no S3 credentials but a token exists', async () => {
    setEnv({ NODE_ENV: 'production', BLOB_READ_WRITE_TOKEN: 'blob-token' })

    const plugin = getStoragePlugin()
    expect(vercelBlobStorageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        access: 'private',
        collections: { media: true },
        token: 'blob-token',
      }),
    )

    const result = await (plugin as (config: PayloadConfig) => Promise<PayloadConfig>)(
      {} as PayloadConfig,
    )
    expect(result).toEqual({})
  })

  it('vercel deployments use private blob even when stray S3 variables are set', async () => {
    // A Vercel project env that carries local-dev S3 values (unreachable from
    // Vercel) must keep using Blob, exactly as before this change.
    setEnv({
      NODE_ENV: 'production',
      VERCEL: '1',
      BLOB_READ_WRITE_TOKEN: 'blob-token',
      S3_ACCESS_KEY_ID: 'key',
      S3_SECRET_ACCESS_KEY: 'secret',
      S3_ENDPOINT: 'http://127.0.0.1:54321/storage/v1/s3',
    })

    const plugin = getStoragePlugin()
    expect(vercelBlobStorageMock).toHaveBeenCalledWith(
      expect.objectContaining({ access: 'private' }),
    )
    expect(s3StorageMock).not.toHaveBeenCalled()

    await (plugin as (config: PayloadConfig) => Promise<PayloadConfig>)({} as PayloadConfig)
  })

  it('uses s3 on a vercel deployment when no blob token exists', () => {
    setEnv({
      NODE_ENV: 'production',
      VERCEL: '1',
      S3_ACCESS_KEY_ID: 'key',
      S3_SECRET_ACCESS_KEY: 'secret',
    })

    expect(getStoragePlugin()).toBe('s3-plugin')
  })

  it('swaps the media staticHandler for the private-store variant', async () => {
    setEnv({
      NODE_ENV: 'production',
      VERCEL: '1',
      BLOB_READ_WRITE_TOKEN: 'vercel_blob_rw_abc123def456_zyx987wvu654',
    })

    const firstHandler = vi.fn(() => null)
    const lastHandler = vi.fn(() => null)
    const config = {
      collections: [
        { slug: 'media', upload: { handlers: [firstHandler, lastHandler] } },
        { slug: 'other', upload: { handlers: [lastHandler] } },
      ],
    } as unknown as PayloadConfig

    const result = await getStoragePlugin()(config)
    const media = result.collections?.find((c) => c.slug === 'media')
    const other = result.collections?.find((c) => c.slug === 'other')
    const handlers = media && typeof media.upload === 'object' ? media.upload.handlers : undefined

    expect(handlers?.[0]).toBe(firstHandler)
    expect(handlers?.[1]).not.toBe(lastHandler)
    expect(handlers?.[1]).not.toBe(firstHandler)
    // Untargeted collections keep their handlers untouched.
    const otherHandlers = other && typeof other.upload === 'object' ? other.upload.handlers : []
    expect(otherHandlers?.[0]).toBe(lastHandler)
  })

  it('throws when neither S3 credentials nor a blob token are available', () => {
    setEnv({ NODE_ENV: 'production' })

    expect(() => getStoragePlugin()).toThrow('S3_ACCESS_KEY_ID')
  })
})
