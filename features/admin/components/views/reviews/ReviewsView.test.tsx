import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { Review } from '@/payload-types'

const copyReview = vi.fn()
const deleteReview = vi.fn()
const refresh = vi.fn()

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const emptyPage = {
  docs: [],
  page: 1,
  totalPages: 1,
  totalDocs: 0,
  hasNextPage: false,
  hasPrevPage: false,
  totalDocsLimit: 20,
  limit: 20,
  pagingCounter: 1,
}

vi.mock('@/features/admin/server/reviews', () => ({
  copyReview: (...args: unknown[]) => copyReview(...args),
  deleteReview: (...args: unknown[]) => deleteReview(...args),
  getAdminReviews: vi.fn(async () => emptyPage),
  getReviewKpis: vi.fn(async () => ({
    totalReviews: 6,
    positiveReviews: 3,
    negativeReviews: 2,
    positivePercent: 60,
    negativePercent: 40,
    averageRating: 3.67,
    bookReviews: 5,
    bookAverageRating: 3.2,
    articleReviews: 1,
    articleAverageRating: 4,
  })),
}))

import ReviewsView from './ReviewsView'

type Kpis = Awaited<ReturnType<typeof import('@/features/admin/server/reviews').getReviewKpis>>

const kpis: Kpis = {
  totalReviews: 6,
  positiveReviews: 3,
  negativeReviews: 2,
  positivePercent: 60,
  negativePercent: 40,
  averageRating: 3.67,
  bookReviews: 5,
  bookAverageRating: 3.2,
  articleReviews: 1,
  articleAverageRating: 4,
}

const review = {
  id: 5,
  rating: 4,
  comment: 'كتاب نافع',
  createdAt: '2026-09-01T00:00:00.000Z',
  user: { fullName: 'أحمد', situation: 'student' },
  book: { title: 'صحيح مسلم', author: 'مسلم' },
} as unknown as Review

const page = (docs: Review[]) => ({
  docs,
  page: 1,
  totalPages: 1,
  totalDocs: docs.length,
  hasNextPage: false,
  hasPrevPage: false,
  totalDocsLimit: 20,
  limit: 20,
  pagingCounter: 1,
})

function renderView() {
  return render(<ReviewsView initialKpis={kpis} initialReviews={page([review])} />)
}

describe('ReviewsView (#156)', () => {
  beforeEach(() => {
    copyReview.mockReset()
    deleteReview.mockReset()
    refresh.mockReset()
    copyReview.mockResolvedValue({ ok: true, reviewId: 9 })
  })

  it('shows an average rating and the per-category counts and averages', () => {
    renderView()

    for (const label of [
      'إجمالي الآراء',
      'المتوسط العام',
      'تقييمات الكتب',
      'متوسط تقييمات الكتب',
      'تقييمات المقالات',
      'متوسط تقييمات المقالات',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    // 6 total, 3.67 overall, 5 books, 3.2 books average, 1 article, 4 articles average.
    for (const value of ['6', '3.67', '5', '3.2', '1', '4']) {
      expect(screen.getByText(value)).toBeInTheDocument()
    }
  })

  it('copies a review after the admin confirms, saying whose name it will carry', async () => {
    const user = userEvent.setup()
    renderView()

    await user.click(screen.getByRole('button', { name: /نسخ التقييم/ }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/باسمك/)).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: /تأكيد النسخ/ }))

    expect(copyReview).toHaveBeenCalledWith(5)
    expect(refresh).toHaveBeenCalled()
  })

  it('does not claim a copy worked when it did not', async () => {
    copyReview.mockResolvedValue({ ok: false, error: 'تعذر نسخ التقييم' })
    const user = userEvent.setup()
    renderView()

    await user.click(screen.getByRole('button', { name: /نسخ التقييم/ }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /تأكيد النسخ/ }))

    expect(refresh).not.toHaveBeenCalled()
    expect(deleteReview).not.toHaveBeenCalled()
  })
})
