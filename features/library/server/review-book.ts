'use server'

import { getPayloadWithUser } from '@/shared/lib/auth'
import { revalidatePath } from 'next/cache'
import type { Payload, PayloadRequest } from 'payload'
import type { User } from '@/payload-types'

export interface ReviewBookParams {
  bookId: number
  rating: number
  comment: string
}

export async function reviewBookLogic(
  params: ReviewBookParams,
  ctx: { payload: Payload; user: User; req: PayloadRequest },
) {
  const { bookId, rating, comment } = params
  const { payload, user, req } = ctx

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
    req,
    overrideAccess: false,
  })

  return review
}

export const reviewBook = async (bookId: number, rating: number, comment: string) => {
  const ctx = await getPayloadWithUser()

  if (!ctx) {
    throw new Error('You must be logged in to review this book')
  }

  const review = await reviewBookLogic({ bookId, rating, comment }, ctx)
  revalidatePath(`/library/book/${bookId}`)
  return review
}
