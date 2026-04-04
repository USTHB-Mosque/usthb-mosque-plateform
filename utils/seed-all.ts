import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { seedUsers, createAdminUser } from './seed/users'
import { seedMedias } from './seed/media'
import { seedBooks } from './seed/book'
import { seedActivities } from './seed/activities'
import { seedArticles } from './seed/articles'
import { seedLoans } from './seed/loans'
import { seedBookFavorites } from './seed/book-favorites'
import { seedActivityRegistrations } from './seed/activity-registrations'
import { COLLECTIONS, CollectionName, SeedOptions, SeedResult, getSeedOrder } from './seed-config'

const seeders: Record<CollectionName, typeof seedUsers> = {
  users: seedUsers,
  media: seedMedias,
  books: seedBooks,
  activities: seedActivities,
  articles: seedArticles,
  loans: seedLoans,
  'book-favorites': seedBookFavorites,
  'activity-registrations': seedActivityRegistrations,
}

function parseArgs(): SeedOptions & { collections?: CollectionName[] } {
  const args = process.argv.slice(2)
  const options: SeedOptions & { collections?: CollectionName[] } = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--force') {
      options.force = true
    } else if (arg === '--dry-run') {
      options.dryRun = true
    } else if (arg === '--count' && args[i + 1]) {
      options.count = parseInt(args[++i], 10)
    } else if (arg.startsWith('--collections=')) {
      options.collections = arg.split('=')[1].split(',') as CollectionName[]
    }
  }

  return options
}

async function seedAll() {
  const options = parseArgs()
  const payload = await getPayload({ config })

  console.log('🌱 Starting seeding process...\n')

  if (options.force) {
    console.log('⚠️  FORCE mode: Will reseed even if data exists\n')
  }

  if (options.dryRun) {
    console.log('🔍 DRY RUN mode: Will not create any data\n')
  }

  let order = getSeedOrder()

  if (options.collections) {
    const selected = new Set(options.collections)
    order = order.filter(c => selected.has(c))
  }

  const results: SeedResult[] = []

  try {
    console.log('👤 Creating admin user...')
    await createAdminUser(payload)
    console.log('✅ Admin user created!\n')

    for (const collection of order) {
      const seeder = seeders[collection]
      const colConfig = COLLECTIONS.find(c => c.name === collection)
      const count = options.count ?? colConfig?.count ?? 10

      const result = await seeder(payload, {
        count,
        force: options.force,
        dryRun: options.dryRun,
      })

      results.push(result)
    }

    console.log('\n========================================')
    console.log('📊 Seeding Summary')
    console.log('========================================')

    let totalSeeded = 0
    let totalSkipped = 0
    let totalFailed = 0

    for (const result of results) {
      totalSeeded += result.seeded
      totalSkipped += result.skipped
      totalFailed += result.failed
      const icon = result.failed > 0 ? '⚠️' : '✅'
      console.log(`${icon} ${result.collection.padEnd(28)} seeded: ${result.seeded}, skipped: ${result.skipped}, failed: ${result.failed}`)
    }

    console.log('----------------------------------------')
    console.log(`Total: seeded: ${totalSeeded}, skipped: ${totalSkipped}, failed: ${totalFailed}`)
    console.log('========================================\n')

    if (totalFailed > 0) {
      console.warn('⚠️  Some seed operations failed. Check the logs above.')
      process.exit(1)
    }

    console.log('🎉 All seeding completed successfully!')
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  }
}

seedAll()
