import 'dotenv/config'
import {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
  type S3ClientConfig,
} from '@aws-sdk/client-s3'

function errorName(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'name' in error && typeof error.name === 'string') {
    return error.name
  }
  return undefined
}

function httpStatus(error: unknown): number | undefined {
  if (error && typeof error === 'object' && '$metadata' in error) {
    const metadata = error.$metadata
    if (metadata && typeof metadata === 'object' && 'httpStatusCode' in metadata) {
      const status = metadata.httpStatusCode
      if (typeof status === 'number') return status
    }
  }
  return undefined
}

function isMissingBucket(error: unknown): boolean {
  const name = errorName(error)
  if (name === 'NotFound' || name === 'NoSuchBucket') return true
  return httpStatus(error) === 404
}

function isBucketAlreadyExists(error: unknown): boolean {
  const name = errorName(error)
  if (name === 'BucketAlreadyExists' || name === 'BucketAlreadyOwnedByYou') return true
  return httpStatus(error) === 409
}

export async function ensureStorageBucket(): Promise<void> {
  const accessKeyId = process.env.S3_ACCESS_KEY_ID
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY

  if (!accessKeyId || !secretAccessKey) {
    console.log('ℹ️  Skipping storage bucket check — S3 credentials not set')
    return
  }

  if (process.env.VERCEL && process.env.BLOB_READ_WRITE_TOKEN) {
    console.log('ℹ️  Skipping storage bucket check — Vercel Blob in use')
    return
  }

  const bucket = process.env.S3_BUCKET || 'media'
  const clientConfig: S3ClientConfig = {
    credentials: { accessKeyId, secretAccessKey },
    region: process.env.S3_REGION || 'local',
    forcePathStyle: true,
  }
  if (process.env.S3_ENDPOINT) {
    clientConfig.endpoint = process.env.S3_ENDPOINT
  }

  const client = new S3Client(clientConfig)

  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }))
    console.log(`ℹ️  Storage bucket "${bucket}" already exists`)
    return
  } catch (error) {
    if (!isMissingBucket(error)) {
      throw error
    }
  }

  try {
    await client.send(new CreateBucketCommand({ Bucket: bucket }))
    console.log(`✅ Storage bucket "${bucket}" created`)
  } catch (error) {
    if (isBucketAlreadyExists(error)) {
      console.log(`ℹ️  Storage bucket "${bucket}" already exists`)
      return
    }
    throw error
  }
}
