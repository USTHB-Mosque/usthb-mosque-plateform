'use server'

import { getPayload } from 'payload'
import payloadConfig from '@/payload.config'
import { getAuthenticatedUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { Payload } from 'payload'
import type { User } from '@/payload-types'

export interface ReviewBookParams {
  bookId: number
  rating: number
  comment: string
}

export async function reviewBookLogic(
  params: ReviewBookParams,
  ctx: { payload: Payload; user: User },
) {
  const { bookId, rating, comment } = params
  const { payload, user } = ctx

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
    req: { payload, user },
    overrideAccess: false,
  })

  return review
}

export const reviewBook = async (bookId: number, rating: number, comment: string) => {
  const payload = await getPayload({ config: payloadConfig })
  const user = await getAuthenticatedUser()

  if (!user) {
    throw new Error('You must be logged in to review this book')
  }

  const review = await reviewBookLogic({ bookId, rating, comment }, { payload, user })
  revalidatePath(`/library/book/${bookId}`)
  return review
}
