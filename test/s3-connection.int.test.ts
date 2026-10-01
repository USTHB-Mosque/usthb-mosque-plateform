import { GetObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3'
import { randomUUID } from 'node:crypto'

import sharp from 'sharp'
import { expect, it } from 'vitest'

import { ensureStorageBucket } from '@/utils/seed/ensure-bucket'
import { getTestPayload, resetDatabase } from './setup-integration'

it('uploads media through Payload into the S3 store', async () => {
  // Only this test opts into S3; the other integration files keep disk storage.
  process.env.PAYLOAD_TEST_S3 = 'true'
  const client = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || 'local',
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    },
  })

  try {
    const payload = await getTestPayload()
    await resetDatabase()
    await ensureStorageBucket()
    const bytes = await sharp({
      create: { width: 1, height: 1, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .png()
      .toBuffer()
    const media = await payload.create({
      collection: 'media',
      data: { alt: 'Storage check' },
      file: {
        data: bytes,
        name: `storage-${randomUUID()}.png`,
        mimetype: 'image/png',
        size: bytes.length,
      },
      overrideAccess: true,
    })

    try {
      const bucket = process.env.S3_BUCKET || 'media'
      const objects = await client.send(
        new ListObjectsV2Command({ Bucket: bucket, Prefix: 'media/' }),
      )
      const key = objects.Contents?.find((object) =>
        object.Key?.endsWith(`/${media.filename}`),
      )?.Key
      expect(key).toBeTruthy()
      const stored = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
      expect(Buffer.from((await stored.Body?.transformToByteArray()) || []).equals(bytes)).toBe(
        true,
      )
    } finally {
      await payload.delete({ collection: 'media', id: media.id, overrideAccess: true })
    }
  } finally {
    delete process.env.PAYLOAD_TEST_S3
    client.destroy()
  }
})
