import type { Payload } from 'payload'
import { createBook } from '../factories/book'
import { withTransaction, type SeedOptions, type SeedResult } from '../shared/types'

export const seedBooks = async (payload: Payload, options: SeedOptions = {}): Promise<SeedResult> => {
  const count = options.count ?? 50
  const force = options.force ?? false
  const startTime = Date.now()

  console.log(`\n🚀 Start Seeding: ${count} books...`)

  if (!force) {
    const existing = await payload.find({ collection: 'books', limit: 1 })
    if (existing.docs.length > 0) {
      console.log('⚠️  Books already exist. Use --force to reseed.')
      return { collection: 'books', seeded: 0, skipped: existing.totalDocs, failed: 0, duration: 0 }
    }
  }

  if (options.dryRun) {
    console.log(`[DRY RUN] Would seed ${count} books`)
    return { collection: 'books', seeded: 0, skipped: 0, failed: 0, duration: 0 }
  }

  const medias = await payload.find({ collection: 'media' })
  const mediaIds = medias.docs.map((media) => media.id)

  if (mediaIds.length === 0) {
    console.warn('⚠️  No media found. Please seed media first.')
    return { collection: 'books', seeded: 0, skipped: 0, failed: 0, duration: 0 }
  }

  const { success, error } = await withTransaction(
    payload,
    async () => {
      for (let i = 0; i < count; i++) {
        const bookNumber = i + 1
        const book = await createBook(payload, mediaIds)

        if (book) {
          console.log(
            `📖 [${bookNumber}/${count}] Created: "${book.title.substring(0, 30)}${book.title.length > 30 ? '...' : ''}"`,
          )
        } else {
          console.warn(`⚠️  [${bookNumber}/${count}] Book creation returned null.`)
        }
      }
    },
    'books',
  )

  const duration = (Date.now() - startTime) / 1000

  if (success) {
    console.log(`\n✨ Finished seeding ${count} books in ${duration.toFixed(2)}s\n`)
    return { collection: 'books', seeded: count, skipped: 0, failed: 0, duration }
  }

  return { collection: 'books', seeded: 0, skipped: 0, failed: count, duration, error }
}
