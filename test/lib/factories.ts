import type { Payload } from 'payload'
import sharp from 'sharp'

import type { Activity, Article, Book, Loan, Media, Review, User } from '@/payload-types'

const minimalRichText = {
  root: {
    type: 'root',
    format: '',
    indent: 0,
    version: 1,
    direction: null,
    children: [
      {
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,
        textFormat: 0,
        textStyle: '',
        children: [{ type: 'text', version: 1, text: 'Test content' }],
      },
    ],
  },
}

// Upload collections require a real file on create, so every media doc the
// factories produce carries a tiny generated PNG.
export async function createTestMedia(
  payload: Payload,
  opts: { isPrivate?: boolean; owner?: number | null; alt?: string } = {},
): Promise<Media> {
  const buffer = await sharp({
    create: { width: 1, height: 1, channels: 3, background: { r: 0, g: 0, b: 0 } },
  })
    .png()
    .toBuffer()

  return (await payload.create({
    collection: 'media',
    data: {
      alt: opts.alt ?? 'test media',
      isPrivate: opts.isPrivate ?? false,
      ...(opts.owner != null ? { owner: opts.owner } : {}),
    },
    file: {
      data: buffer,
      name: `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`,
      mimetype: 'image/png',
      size: buffer.length,
    },
    overrideAccess: true,
  })) as Media
}

export async function createTestBook(
  payload: Payload,
  opts: { available?: number; total?: number; title?: string } = {},
): Promise<Book> {
  return (await payload.create({
    collection: 'books',
    data: {
      title: opts.title ?? 'Test Book',
      author: 'Test Author',
      type: 'aqidah',
      category: 'religious',
      shortDescription: 'A book used by the test suite.',
      availableBooks: opts.available ?? 3,
      totalBooks: opts.total ?? 3,
    },
    overrideAccess: true,
  })) as Book
}

export async function createTestArticle(
  payload: Payload,
  opts: { title?: string; image?: number } = {},
): Promise<Article> {
  const media = opts.image ?? (await createTestMedia(payload, { alt: 'article image' })).id
  return (await payload.create({
    collection: 'articles',
    data: {
      title: opts.title ?? 'Test Article',
      type: 'aqidah',
      author: 'Test Author',
      description: 'A short test article summary.',
      content: minimalRichText as unknown as Article['content'],
      image: media,
    },
    overrideAccess: true,
  })) as Article
}

export async function createTestActivity(
  payload: Payload,
  opts: {
    title?: string
    openForRegistration?: boolean
    registrationDeadline?: Date | null
    maxParticipants?: number | null
    currentParticipants?: number
  } = {},
): Promise<Activity> {
  const media = await createTestMedia(payload, { alt: 'activity image' })
  return (await payload.create({
    collection: 'activities',
    data: {
      title: opts.title ?? 'Test Activity',
      type: 'aqidah',
      image: media.id,
      shortDescription: 'A short test activity description.',
      longDescription: minimalRichText as unknown as Activity['longDescription'],
      benefits: [{ name: 'benefit' }],
      targetAudience: [{ name: 'students' }],
      schedules: [{ dateAndTime: new Date().toISOString() }],
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      openForRegistration: opts.openForRegistration ?? true,
      ...(opts.registrationDeadline === undefined
        ? {}
        : { registrationDeadline: opts.registrationDeadline?.toISOString() ?? null }),
      ...(opts.maxParticipants === undefined
        ? {}
        : { maxParticipants: opts.maxParticipants ?? null }),
      currentParticipants: opts.currentParticipants ?? 0,
    },
    overrideAccess: true,
  })) as Activity
}

export async function createTestReview(
  payload: Payload,
  opts: { user: number; book: number; rating: number; comment?: string },
): Promise<Review> {
  return (await payload.create({
    collection: 'reviews',
    data: {
      user: opts.user,
      book: opts.book,
      rating: opts.rating,
      comment: opts.comment ?? 'test comment',
    },
    overrideAccess: true,
  })) as Review
}

/**
 * Creates a loan row directly in any state. The create guard hooks only gate
 * member-facing creates (no `user` is attached here), so this is free to
 * produce seeds for a specific transition under test.
 */
export async function createTestLoan(
  payload: Payload,
  opts: {
    book: number
    user: number
    status?: Loan['status']
    loanDate?: string
    pickupDate?: string
    pickupHour?: string
    pickupCode?: string
    dueDate?: string
    returnDate?: string
    refusalReason?: string
  },
): Promise<Loan> {
  return (await payload.create({
    collection: 'loans',
    data: {
      book: opts.book,
      user: opts.user,
      status: opts.status ?? 'pending',
      loanDate: opts.loanDate ?? new Date().toISOString(),
      ...(opts.pickupDate ? { pickupDate: opts.pickupDate } : {}),
      ...(opts.pickupHour ? { pickupHour: opts.pickupHour } : {}),
      ...(opts.pickupCode ? { pickupCode: opts.pickupCode } : {}),
      ...(opts.dueDate ? { dueDate: opts.dueDate } : {}),
      ...(opts.returnDate ? { returnDate: opts.returnDate } : {}),
      ...(opts.refusalReason ? { refusalReason: opts.refusalReason } : {}),
    },
    overrideAccess: true,
  })) as Loan
}
