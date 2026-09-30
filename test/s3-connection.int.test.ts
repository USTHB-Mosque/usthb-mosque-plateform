import {
  CreateBucketCommand,
  DeleteBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { randomUUID } from 'node:crypto'
import { expect, it } from 'vitest'

it('stores and retrieves media through the S3-compatible endpoint', async () => {
  const client = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || 'local',
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    },
  })
  const bucket = `media-integration-${randomUUID()}`
  const key = 'storage-check.txt'
  let bucketCreated = false

  try {
    await client.send(new CreateBucketCommand({ Bucket: bucket }))
    bucketCreated = true
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: 'media round trip' }))
    const stored = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
    expect(await stored.Body?.transformToString()).toBe('media round trip')
  } finally {
    if (bucketCreated) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
      await client.send(new DeleteBucketCommand({ Bucket: bucket }))
    }
    client.destroy()
  }
})
