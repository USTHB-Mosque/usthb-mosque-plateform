'use server'

import { getPayload } from 'payload'
import payloadConfig from '@/payload.config'
import { getAuthenticatedUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export const reviewBook = async (bookId: number, rating: number, comment: string) => {
  const payload = await getPayload({
    config: payloadConfig,
  })

  const user = await getAuthenticatedUser()

  if (!user) {
    throw new Error('You must be logged in to review this book')
  }

  if (!rating || !comment) {
    throw new Error('Please provide a rating and comment')
  }

  const review = await payload.create({
    collection: 'reviews',
    data: {
      user: user.id,
      book: bookId,
      rating: Number(rating),
      comment,
    },
  })
  revalidatePath(`/library/book/${bookId}`)
  return review
}
