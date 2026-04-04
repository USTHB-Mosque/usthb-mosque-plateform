import type { Payload } from 'payload'
import { createActivityRegistration } from '../factories/activity-registration'
import { withTransaction, type SeedOptions, type SeedResult } from '../shared/types'

export const seedActivityRegistrations = async (payload: Payload, options: SeedOptions = {}): Promise<SeedResult> => {
  const count = options.count ?? 30
  const force = options.force ?? false
  const startTime = Date.now()

  console.log(`\n🎯 Start Seeding: ${count} activity registrations...`)

  if (!force) {
    const existing = await payload.find({ collection: 'activity-registrations', limit: 1 })
    if (existing.docs.length > 0) {
      console.log('⚠️  Activity registrations already exist. Use --force to reseed.')
      return { collection: 'activity-registrations', seeded: 0, skipped: existing.totalDocs, failed: 0, duration: 0 }
    }
  }

  if (options.dryRun) {
    console.log(`[DRY RUN] Would seed ${count} activity registrations`)
    return { collection: 'activity-registrations', seeded: 0, skipped: 0, failed: 0, duration: 0 }
  }

  const activities = await payload.find({ collection: 'activities', limit: 1000 })
  const users = await payload.find({ collection: 'users', limit: 1000 })

  const activityIds = activities.docs.map((activity) => activity.id)
  const userIds = users.docs.map((user) => user.id)

  if (activityIds.length === 0 || userIds.length === 0) {
    console.warn('⚠️  No activities or users found. Skipping activity registration seeding.')
    return { collection: 'activity-registrations', seeded: 0, skipped: 0, failed: 0, duration: 0 }
  }

  const { success, error } = await withTransaction(
    payload,
    async () => {
      for (let i = 0; i < count; i++) {
        const regNumber = i + 1
        const registration = await createActivityRegistration(payload, activityIds, userIds)

        if (registration) {
          const attendedStatus = registration.attended ? '✓' : '✗'
          console.log(
            `🎯 [${regNumber}/${count}] Created registration: #${registration.id} (Attended: ${attendedStatus})`,
          )
        } else {
          console.warn(`⚠️  [${regNumber}/${count}] Registration creation returned null.`)
        }
      }
    },
    'activity-registrations',
  )

  const duration = (Date.now() - startTime) / 1000

  if (success) {
    console.log(`\n✨ Finished seeding ${count} activity registrations in ${duration.toFixed(2)}s\n`)
    return { collection: 'activity-registrations', seeded: count, skipped: 0, failed: 0, duration }
  }

  return { collection: 'activity-registrations', seeded: 0, skipped: 0, failed: count, duration, error }
}
