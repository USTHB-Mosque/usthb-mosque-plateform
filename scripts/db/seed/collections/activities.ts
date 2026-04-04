import type { Payload } from 'payload'
import { createActivity } from '../factories/activity'
import { withTransaction, type SeedOptions, type SeedResult } from '../shared/types'

export const seedActivities = async (payload: Payload, options: SeedOptions = {}): Promise<SeedResult> => {
  const count = options.count ?? 50
  const force = options.force ?? false
  const startTime = Date.now()

  console.log(`\n🚀 Start Seeding: ${count} activities...`)

  if (!force) {
    const existing = await payload.find({ collection: 'activities', limit: 1 })
    if (existing.docs.length > 0) {
      console.log('⚠️  Activities already exist. Use --force to reseed.')
      return { collection: 'activities', seeded: 0, skipped: existing.totalDocs, failed: 0, duration: 0 }
    }
  }

  if (options.dryRun) {
    console.log(`[DRY RUN] Would seed ${count} activities`)
    return { collection: 'activities', seeded: 0, skipped: 0, failed: 0, duration: 0 }
  }

  const medias = await payload.find({ collection: 'media' })
  const mediaIds = medias.docs.map((media) => media.id)

  if (mediaIds.length === 0) {
    console.warn('⚠️  No media found. Please seed media first.')
    return { collection: 'activities', seeded: 0, skipped: 0, failed: 0, duration: 0 }
  }

  const { success, error } = await withTransaction(
    payload,
    async () => {
      for (let i = 0; i < count; i++) {
        const activityNumber = i + 1
        const activity = await createActivity(payload, mediaIds)

        if (activity) {
          console.log(
            `📖 [${activityNumber}/${count}] Created: "${activity.title.substring(0, 30)}${activity.title.length > 30 ? '...' : ''}"`,
          )
        } else {
          console.warn(`⚠️  [${activityNumber}/${count}] activity creation returned null.`)
        }
      }
    },
    'activities',
  )

  const duration = (Date.now() - startTime) / 1000

  if (success) {
    console.log(`\n✨ Finished seeding ${count} activities in ${duration.toFixed(2)}s\n`)
    return { collection: 'activities', seeded: count, skipped: 0, failed: 0, duration }
  }

  return { collection: 'activities', seeded: 0, skipped: 0, failed: count, duration, error }
}
