import config from '@/payload.config'
import { getPayload, type Payload } from 'payload'
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

export const createMedia = async (payload: Payload, altText: string, index: number) => {
  const imageData = await readImageAsBuffer(RAMADAN_IMAGE_PATH)

  if (!imageData) {
    return await payload.create({
      collection: 'media',
      data: {
        alt: altText,
      },
      overrideAccess: true,
    })
  }

  const filename = `${altText.replace(/\s+/g, '-')}-${index + 1}.png`

  try {
    return await payload.create({
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
  } catch (uploadError: unknown) {
    const errorMessage = uploadError instanceof Error ? uploadError.message : String(uploadError)

    if (errorMessage.includes('Invalid Access Key') || errorMessage.includes('EAUTH') || errorMessage.includes('NoSuchBucket')) {
      return await payload.create({
        collection: 'media',
        data: {
          alt: altText,
        },
        overrideAccess: true,
      })
    }

    throw uploadError
  }
}
