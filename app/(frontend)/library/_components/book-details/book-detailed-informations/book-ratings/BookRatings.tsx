'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import CreateRating from './CreateRating'
import { reviewsRequests } from '@/lib/apis/reviews/requests'
import type { Review } from '@/payload-types'

const BookRatings = ({ bookId }: { bookId: number }) => {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  const fetchReviews = async () => {
    try {
      const result = await reviewsRequests.getByBookId(bookId, 1)
      setReviews(result.docs)
    } catch (error) {
      console.error('Error fetching reviews:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReviews()
  }, [bookId])

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col gap-6">
          <CreateRating bookId={bookId} />
          
          {loading ? (
            <div className="text-center text-muted-foreground">جاري التحميل...</div>
          ) : reviews.length === 0 ? (
            <div className="text-center text-muted-foreground">لا توجد تقييمات بعد</div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {reviews.map((review) => (
                <div key={review.id} className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className={star <= (review.rating || 0) ? 'text-primary' : 'text-gray-300'}>
                        ★
                      </span>
                    ))}
                  </div>
                  <p className="text-sm">{review.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default BookRatings