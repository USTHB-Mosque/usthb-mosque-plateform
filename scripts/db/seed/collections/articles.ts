import type { Payload } from 'payload'
import { createArticle } from '../factories/article'
import { withTransaction, type SeedOptions, type SeedResult } from '../shared/types'

export const seedArticles = async (payload: Payload, options: SeedOptions = {}): Promise<SeedResult> => {
  const count = options.count ?? 50
  const force = options.force ?? false
  const startTime = Date.now()

  console.log(`\n🚀 Start Seeding: ${count} articles...`)

  if (!force) {
    const existing = await payload.find({ collection: 'articles', limit: 1 })
    if (existing.docs.length > 0) {
      console.log('⚠️  Articles already exist. Use --force to reseed.')
      return { collection: 'articles', seeded: 0, skipped: existing.totalDocs, failed: 0, duration: 0 }
    }
  }

  if (options.dryRun) {
    console.log(`[DRY RUN] Would seed ${count} articles`)
    return { collection: 'articles', seeded: 0, skipped: 0, failed: 0, duration: 0 }
  }

  const medias = await payload.find({ collection: 'media' })
  const mediaIds = medias.docs.map((media) => media.id)

  if (mediaIds.length === 0) {
    console.warn('⚠️  No media found. Please seed media first.')
    return { collection: 'articles', seeded: 0, skipped: 0, failed: 0, duration: 0 }
  }

  const { success, error } = await withTransaction(
    payload,
    async () => {
      for (let i = 0; i < count; i++) {
        const articleNumber = i + 1
        const article = await createArticle(payload, mediaIds)

        if (article) {
          console.log(
            `📖 [${articleNumber}/${count}] Created: "${article.title.substring(0, 30)}${article.title.length > 30 ? '...' : ''}"`,
          )
        } else {
          console.warn(`⚠️  [${articleNumber}/${count}] article creation returned null.`)
        }
      }
    },
    'articles',
  )

  const duration = (Date.now() - startTime) / 1000

  if (success) {
    console.log(`\n✨ Finished seeding ${count} articles in ${duration.toFixed(2)}s\n`)
    return { collection: 'articles', seeded: count, skipped: 0, failed: 0, duration }
  }

  return { collection: 'articles', seeded: 0, skipped: 0, failed: count, duration, error }
}
