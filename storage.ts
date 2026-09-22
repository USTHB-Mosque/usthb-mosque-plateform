import type { Plugin } from 'payload'
import { s3Storage } from '@payloadcms/storage-s3'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import { Media } from './collections'

/**
 * Storage selection, in priority order:
 *
 * 1. S3 (any environment, including the Docker deploy) — selected whenever
 *    S3 credentials are present, so one adapter serves local Supabase S3,
 *    the compose MinIO, and any remote S3-compatible provider.
 * 2. Vercel Blob — kept so Vercel deployments keep working unchanged: when
 *    there are no S3 credentials but a Blob token exists, Blob is used.
 * 3. Otherwise, fail loudly: a config that cannot store media must not boot.
 */
export function getStoragePlugin(): Plugin {
  const hasS3Credentials = Boolean(process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY)

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

  if (process.env.BLOB_READ_WRITE_TOKEN) {
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
