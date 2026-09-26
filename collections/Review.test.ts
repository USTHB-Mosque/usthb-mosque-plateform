import { describe, expect, it } from 'vitest'
import { Review } from './Review'

const validate = Review.hooks?.beforeValidate?.[0] as (args: {
  data?: Record<string, unknown>
}) => unknown

describe('Review beforeValidate hook', () => {
  it('passes through undefined data', () => {
    expect(validate({ data: undefined })).toBeUndefined()
  })

  it('rejects zero or two review targets and accepts exactly one', () => {
    expect(() => validate({ data: { rating: 5 } })).toThrow(
      'يجب أن يستهدف التقييم كتاباً أو مقالاً واحداً بالضبط',
    )
    expect(() => validate({ data: { book: 1, article: 2 } })).toThrow(
      'يجب أن يستهدف التقييم كتاباً أو مقالاً واحداً بالضبط',
    )
    const bookReview = { book: 1 }
    const articleReview = { article: 2 }
    expect(validate({ data: bookReview })).toBe(bookReview)
    expect(validate({ data: articleReview })).toBe(articleReview)
  })
})
