import config from '@/payload.config'
import { faker } from '@faker-js/faker'
import { getPayload } from 'payload'

export async function fetchRandomImageAsFile() {
  const imageUrl = faker.image.url({ width: 640, height: 480 })

  try {
    const response = await fetch(imageUrl)

    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`)

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const filename = `${faker.string.ulid()}.jpg`

    return {
      buffer,
      filename,
      mimeType: 'image/jpeg',
    }
  } catch (error) {
    return null
  }
}

export const seedMedias = async (n: number = 10) => {
  const payload = await getPayload({ config })

  for (let i = 0; i < n; i++) {
    try {
      const imageData = await fetchRandomImageAsFile()

      if (!imageData) {
        console.log(`Skipping index ${i}: Image fetch failed`)
        continue
      }

      const media = await payload.create({
        collection: 'media',
        data: {
          alt: faker.lorem.words(3),
        },
        file: {
          data: imageData.buffer,
          mimetype: 'image/jpeg',
          name: imageData.filename,
          size: imageData.buffer.byteLength,
        },
      })

      console.log(`✅ Media ${i + 1}/${n} created : ${media.id}`)
    } catch (error) {
      console.error(`❌ Erreur on index ${i}:`, error)
    }
  }
}
