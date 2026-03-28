import { getPayload } from 'payload'
import config from '@/payload.config'
import { fakerAR as faker } from '@faker-js/faker'

export const createBookFavorite = async (bookIds: number[], userIds: number[]) => {
  const payload = await getPayload({ config })

  let attempts = 0
  while (attempts < 10) {
    const userId = faker.helpers.arrayElement(userIds)
    const bookId = faker.helpers.arrayElement(bookIds)

    const existingFav = await payload.find({
      collection: 'book-favorites',
      where: {
        and: [{ user: { equals: userId } }, { book: { equals: bookId } }],
      },
      limit: 1,
    })

    if (existingFav.totalDocs === 0) {
      const favorite = await payload.create({
        collection: 'book-favorites',
        data: {
          user: userId,
          book: bookId,
        },
      })

      return favorite
    }

    attempts++
  }

  throw new Error('Could not create unique book favorite after 10 attempts')
}

export const seedBookFavorites = async (n: number = 10) => {
  console.log(`\n⭐ Start Seeding: ${n} book favorites...`)
  const startTime = Date.now()

  const payload = await getPayload({ config })

  // Get books
  const books = await payload.find({
    collection: 'books',
    limit: 1000,
  })

  // Get users
  const users = await payload.find({
    collection: 'users',
    limit: 1000,
  })

  const bookIds = books.docs.map((book) => book.id)
  const userIds = users.docs.map((user) => user.id)

  if (bookIds.length === 0 || userIds.length === 0) {
    console.warn('⚠️  No books or users found. Skipping book favorite seeding.')
    return
  }

  for (let i = 0; i < n; i++) {
    const favNumber = i + 1

    try {
      const favorite = await createBookFavorite(bookIds, userIds)

      if (favorite) {
        console.log(`⭐ [${favNumber}/${n}] Created favorite: #${favorite.id}`)
      } else {
        console.warn(`⚠️  [${favNumber}/${n}] Favorite creation returned null.`)
      }
    } catch (error) {
      console.error(
        `❌ [${favNumber}/${n}] Error creating favorite:`,
        error instanceof Error ? error.message : error,
      )
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2)
  console.log(`\n✨ Finished seeding ${n} book favorites in ${duration}s\n`)
}
