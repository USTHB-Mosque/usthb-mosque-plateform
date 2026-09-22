import type { Plugin } from 'payload'
import { s3Storage } from '@payloadcms/storage-s3'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import { Media } from './collections'

/**
 * Storage selection, in priority order:
 *
 * 1. Vercel deployments use Vercel Blob whenever a Blob token is present —
 *    exactly today's behavior, taking precedence over any stray S3 variables
 *    (e.g. local-dev Supabase S3 values that would be unreachable from Vercel).
 * 2. S3 everywhere else (local dev, the Docker deploy, or an explicit
 *    S3-only Vercel project) — selected whenever S3 credentials are present,
 *    so one adapter serves local Supabase S3, the compose MinIO, and any
 *    remote S3-compatible provider.
 * 3. Non-Vercel fallback to Blob when only a token exists.
 * 4. Otherwise, fail loudly: a config that cannot store media must not boot.
 */
export function getStoragePlugin(): Plugin {
  const hasS3Credentials = Boolean(process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY)
  const hasBlobToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN)
  const isVercelDeployment = Boolean(process.env.VERCEL)

  if (isVercelDeployment && hasBlobToken) {
    return vercelBlobStorage({
      collections: {
        [Media.slug]: true,
      },
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })
  }

  if (hasS3Credentials) {
    return s3Storage({
      collections: {
        [Media.slug]: {
          prefix: 'media',
        },
      },
      bucket: process.env.S3_BUCKET || 'media',
      config: {
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
        },
        region: process.env.S3_REGION || 'local',
        endpoint: process.env.S3_ENDPOINT || '',
        forcePathStyle: true,
      },
    })
  }

  if (hasBlobToken) {
    return vercelBlobStorage({
      collections: {
        [Media.slug]: true,
      },
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })
  }

  throw new Error(
    'No storage backend configured. Set S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY ' +
      'for S3-compatible storage, or BLOB_READ_WRITE_TOKEN for Vercel Blob.',
  )
}
