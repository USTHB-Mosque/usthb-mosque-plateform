import config from '@/payload.config'
import { getPayload, type Payload } from 'payload'
import path from 'path'
import fs from 'fs'
import type { SeedOptions, SeedResult } from '../seed-config'

const RAMADAN_IMAGE_PATH = path.resolve(process.cwd(), 'public/static/images/ramadan.png')

async function readImageAsBuffer(filePath: string): Promise<{ buffer: Buffer; filename: string; mimeType: string } | null> {
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ Image not found: ${filePath}`)
      return null
    }

    const buffer = fs.readFileSync(filePath)
    const ext = path.extname(filePath).toLowerCase()
    const mimeType = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/jpeg'

    return {
      buffer,
      filename: path.basename(filePath),
      mimeType,
    }
  } catch (error) {
    console.error(`Error reading image: ${error}`)
    return null
  }
}

export const seedMedias = async (_payload: Payload, options: SeedOptions = {}): Promise<SeedResult> => {
  const count = options.count ?? 50
  const force = options.force ?? false
  const startTime = Date.now()

  console.log(`\n📷 Start Seeding: ${count} medias...`)

  const payload = await getPayload({ config })

  if (!force) {
    const existing = await payload.find({ collection: 'media', limit: 1 })
    if (existing.docs.length > 0) {
      console.log('⚠️  Media already exists. Use --force to reseed.')
      return { collection: 'media', seeded: 0, skipped: existing.totalDocs, failed: 0, duration: 0 }
    }
  }

  if (options.dryRun) {
    console.log(`[DRY RUN] Would seed ${count} medias`)
    return { collection: 'media', seeded: 0, skipped: 0, failed: 0, duration: 0 }
  }

  const imageData = await readImageAsBuffer(RAMADAN_IMAGE_PATH)

  let successCount = 0
  let failCount = 0

  if (!imageData) {
    console.error('❌ Failed to read ramadan.png, creating placeholders only')
    for (let i = 0; i < count; i++) {
      try {
        const altText = i === 0 ? 'ramadan' : `seed image ${i}`
        await payload.create({
          collection: 'media',
          data: {
            alt: altText,
          },
          overrideAccess: true,
        })
        successCount++
      } catch (error) {
        failCount++
      }
    }
    console.log(`📊 Media seeding: ${successCount} created, ${failCount} failed`)
    return { collection: 'media', seeded: successCount, skipped: 0, failed: failCount, duration: 0 }
  }

  for (let i = 0; i < count; i++) {
    try {
      const altText = i === 0 ? 'ramadan' : `seed image ${i}`
      const filename = `${altText.replace(/\s+/g, '-')}-${i + 1}.png`

      try {
        await payload.create({
          collection: 'media',
          data: {
            alt: altText,
          },
          file: {
            data: imageData.buffer,
            mimetype: imageData.mimeType,
            name: filename,
            size: imageData.buffer.byteLength,
          },
        })
        console.log(`✅ Media ${i + 1}/${count} created: ${altText}`)
        successCount++
      } catch (uploadError: unknown) {
        const errorMessage = uploadError instanceof Error ? uploadError.message : String(uploadError)

        if (errorMessage.includes('Invalid Access Key') || errorMessage.includes('EAUTH') || errorMessage.includes('NoSuchBucket')) {
          console.log(`⚠️ Upload failed for ${altText}, creating placeholder...`)

          await payload.create({
            collection: 'media',
            data: {
              alt: altText,
            },
            overrideAccess: true,
          })
          console.log(`✅ Media ${i + 1}/${count} created as placeholder: ${altText}`)
          successCount++
        } else {
          throw uploadError
        }
      }
    } catch (error) {
      console.error(`❌ Error on index ${i}:`, error)
      failCount++
    }
  }

  const duration = (Date.now() - startTime) / 1000
  console.log(`\n📊 Media seeding complete: ${successCount} success, ${failCount} failed in ${duration.toFixed(2)}s`)
  return { collection: 'media', seeded: successCount, skipped: 0, failed: failCount, duration }
}