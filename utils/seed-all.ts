import 'dotenv/config'
import { seedUsers, createAdminUser } from './seed/users'
import { seedMedias } from './seed/media'
import { seedBooks } from './seed/book'
import { seedActivities } from './seed/activities'
import { seedArticles } from './seed/articles'
import { seedLoans } from './seed/loans'
import { seedBookFavorites } from './seed/book-favorites'
import { seedActivityRegistrations } from './seed/activity-registrations'

async function seedAll() {
  console.log('🌱 Starting seeding process...\n')

  try {
    console.log('👤 Creating admin user...')
    await createAdminUser()
    console.log('✅ Admin user created!\n')

    console.log('👤 Seeding Users (20 items)...')
    await seedUsers(20)
    console.log('✅ Users seeded!\n')

    console.log('📷 Seeding Medias (50 items)...')
    await seedMedias(50)
    console.log('✅ Medias seeded!\n')

    console.log('📚 Seeding Books (50 items)...')
    await seedBooks(50)
    console.log('✅ Books seeded!\n')

    console.log('🎉 Seeding Activities (50 items)...')
    await seedActivities(50)
    console.log('✅ Activities seeded!\n')

    console.log('📰 Seeding Articles (50 items)...')
    await seedArticles(50)
    console.log('✅ Articles seeded!\n')

    console.log('📋 Seeding Loans (30 items)...')
    await seedLoans(30)
    console.log('✅ Loans seeded!\n')

    console.log('❤️ Seeding Book Favorites (30 items)...')
    await seedBookFavorites(30)
    console.log('✅ Book Favorites seeded!\n')

    console.log('🙋 Seeding Activity Registrations (30 items)...')
    await seedActivityRegistrations(30)
    console.log('✅ Activity Registrations seeded!\n')

    console.log('🎉 All seeding completed successfully!')
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  }
}

seedAll()