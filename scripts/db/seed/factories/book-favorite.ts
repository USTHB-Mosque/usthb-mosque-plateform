import type { Payload } from 'payload'
import { fakerAR as faker } from '@faker-js/faker'

export const createBookFavorite = async (payload: Payload, bookIds: number[], userIds: number[]) => {
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
      return await payload.create({
        collection: 'book-favorites',
        data: {
          user: userId,
          book: bookId,
        },
      })
    }

    attempts++
  }

  throw new Error('Could not create unique book favorite after 10 attempts')
}
