import type { Payload } from 'payload'
import { createMedia } from '../factories/media'
import { withTransaction, type SeedOptions, type SeedResult } from '../shared/types'

export const seedMedia = async (payload: Payload, options: SeedOptions = {}): Promise<SeedResult> => {
  const count = options.count ?? 50
  const force = options.force ?? false
  const startTime = Date.now()

  console.log(`\n📷 Start Seeding: ${count} medias...`)

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

  const { success, error } = await withTransaction(
    payload,
    async () => {
      for (let i = 0; i < count; i++) {
        const altText = i === 0 ? 'ramadan' : `seed image ${i}`
        await createMedia(payload, altText, i)
        console.log(`✅ Media ${i + 1}/${count} created: ${altText}`)
      }
    },
    'media',
  )

  const duration = (Date.now() - startTime) / 1000

  if (success) {
    console.log(`\n✨ Finished seeding ${count} medias in ${duration.toFixed(2)}s\n`)
    return { collection: 'media', seeded: count, skipped: 0, failed: 0, duration }
  }

  return { collection: 'media', seeded: 0, skipped: 0, failed: count, duration, error }
}
