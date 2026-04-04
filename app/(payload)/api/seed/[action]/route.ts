import { getPayload } from 'payload'
import config from '@/payload.config'
import { NextRequest } from 'next/server'
import { seedBooks } from '@/utils/seed/book'
import { seedMedias } from '@/utils/seed/media'
import { seedArticles } from '@/utils/seed/articles'
import { seedActivities } from '@/utils/seed/activities'
import { seedLoans } from '@/utils/seed/loans'
import { seedBookFavorites } from '@/utils/seed/book-favorites'
import { seedActivityRegistrations } from '@/utils/seed/activity-registrations'
import { seedUsers, createAdminUser } from '@/utils/seed/users'
import { COLLECTIONS, CollectionName, SeedResult } from '@/utils/seed-config'

const seeders: Record<string, (payload: any, options: any) => Promise<SeedResult>> = {
  books: seedBooks,
  media: seedMedias,
  articles: seedArticles,
  activities: seedActivities,
  loans: seedLoans,
  favorites: seedBookFavorites,
  registrations: seedActivityRegistrations,
  users: seedUsers,
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  const { action } = await params
  const searchParams = request.nextUrl.searchParams
  const count = parseInt(searchParams.get('count') || '50', 10)
  const force = searchParams.get('force') === 'true'

  const payload = await getPayload({ config })

  if (action === 'all') {
    const results: SeedResult[] = []

    await createAdminUser(payload)

    for (const col of COLLECTIONS) {
      const seeder = seeders[col.name]
      if (seeder) {
        const result = await seeder(payload, { count, force })
        results.push(result)
      }
    }

    return Response.json({ results })
  }

  const seeder = seeders[action]
  if (!seeder) {
    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 })
  }

  const result = await seeder(payload, { count, force })
  return Response.json(result)
}
