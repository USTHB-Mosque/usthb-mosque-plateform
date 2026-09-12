import type { Plugin } from 'payload'
import { s3Storage } from '@payloadcms/storage-s3'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import { Media } from './collections'

export function getStoragePlugin(): Plugin {
  if (process.env.NODE_ENV === 'development') {
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

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      'BLOB_READ_WRITE_TOKEN is required for non-development environments. ' +
        'Set it in your environment variables.',
    )
  }

  return vercelBlobStorage({
    collections: {
      [Media.slug]: true,
    },
    token: process.env.BLOB_READ_WRITE_TOKEN,
  })
}
