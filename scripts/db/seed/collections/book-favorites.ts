import type { Payload } from 'payload'
import { createBookFavorite } from '../factories/book-favorite'
import { withTransaction, type SeedOptions, type SeedResult } from '../shared/types'

export const seedBookFavorites = async (payload: Payload, options: SeedOptions = {}): Promise<SeedResult> => {
  const count = options.count ?? 30
  const force = options.force ?? false
  const startTime = Date.now()

  console.log(`\n⭐ Start Seeding: ${count} book favorites...`)

  if (!force) {
    const existing = await payload.find({ collection: 'book-favorites', limit: 1 })
    if (existing.docs.length > 0) {
      console.log('⚠️  Book favorites already exist. Use --force to reseed.')
      return { collection: 'book-favorites', seeded: 0, skipped: existing.totalDocs, failed: 0, duration: 0 }
    }
  }

  if (options.dryRun) {
    console.log(`[DRY RUN] Would seed ${count} book favorites`)
    return { collection: 'book-favorites', seeded: 0, skipped: 0, failed: 0, duration: 0 }
  }

  const books = await payload.find({ collection: 'books', limit: 1000 })
  const users = await payload.find({ collection: 'users', limit: 1000 })

  const bookIds = books.docs.map((book) => book.id)
  const userIds = users.docs.map((user) => user.id)

  if (bookIds.length === 0 || userIds.length === 0) {
    console.warn('⚠️  No books or users found. Skipping book favorite seeding.')
    return { collection: 'book-favorites', seeded: 0, skipped: 0, failed: 0, duration: 0 }
  }

  const { success, error } = await withTransaction(
    payload,
    async () => {
      for (let i = 0; i < count; i++) {
        const favNumber = i + 1
        const favorite = await createBookFavorite(payload, bookIds, userIds)

        if (favorite) {
          console.log(`⭐ [${favNumber}/${count}] Created favorite: #${favorite.id}`)
        } else {
          console.warn(`⚠️  [${favNumber}/${count}] Favorite creation returned null.`)
        }
      }
    },
    'book-favorites',
  )

  const duration = (Date.now() - startTime) / 1000

  if (success) {
    console.log(`\n✨ Finished seeding ${count} book favorites in ${duration.toFixed(2)}s\n`)
    return { collection: 'book-favorites', seeded: count, skipped: 0, failed: 0, duration }
  }

  return { collection: 'book-favorites', seeded: 0, skipped: 0, failed: count, duration, error }
}
