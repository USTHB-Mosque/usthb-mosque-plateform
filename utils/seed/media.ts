import config from '@/payload.config'
import { getPayload } from 'payload'
import path from 'path'
import fs from 'fs'

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

export const seedMedias = async (n: number = 10) => {
  const payload = await getPayload({ config })

  let successCount = 0
  let failCount = 0
  let skipCount = 0

  const imageData = await readImageAsBuffer(RAMADAN_IMAGE_PATH)

  if (!imageData) {
    console.error('❌ Failed to read ramadan.png, creating placeholders only')
    for (let i = 0; i < n; i++) {
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
    return { successCount, skipCount, failCount }
  }

  for (let i = 0; i < n; i++) {
    try {
      const altText = i === 0 ? 'ramadan' : `seed image ${i}`
      const filename = `${altText.replace(/\s+/g, '-')}-${i + 1}.png`

      try {
        const media = await payload.create({
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
        console.log(`✅ Media ${i + 1}/${n} created: ${altText}`)
        successCount++
      } catch (uploadError: unknown) {
        const errorMessage = uploadError instanceof Error ? uploadError.message : String(uploadError)

        if (errorMessage.includes('Invalid Access Key') || errorMessage.includes('EAUTH') || errorMessage.includes('NoSuchBucket')) {
          console.log(`⚠️ Upload failed for ${altText}, creating placeholder...`)

          const media = await payload.create({
            collection: 'media',
            data: {
              alt: altText,
            },
            overrideAccess: true,
          })
          console.log(`✅ Media ${i + 1}/${n} created as placeholder: ${altText}`)
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

  console.log(`\n📊 Media seeding complete: ${successCount} success, ${skipCount} skipped, ${failCount} failed`)
  return { successCount, skipCount, failCount }
}