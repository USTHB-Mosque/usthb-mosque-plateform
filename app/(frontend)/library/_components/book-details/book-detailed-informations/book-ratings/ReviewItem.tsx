import { Review, User } from '@/payload-types'
import { format } from 'date-fns'
import { arDZ } from 'date-fns/locale'
import { Star } from 'lucide-react'
import React from 'react'

interface ReviewItemProps {
  review: Review
}

const ReviewItem: React.FC<ReviewItemProps> = ({ review }) => {
  const user = review.user as User
  return (
    <div key={review.id} className="rounded-lg border border-border p-3 bg-background">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-semibold">{user?.fullName}</p>
          <p className="text-xs text-muted-foreground">
            {review.createdAt
              ? format(new Date(review.createdAt), 'EEEE d MMMM yyyy', {
                  locale: arDZ,
                })
              : 'تاريخ غير محدد'}
          </p>
        </div>
        <div className="flex items-center gap-0.5 text-yellow-400">
          {Array.from({ length: 5 }, (_, i) => (
            <Star
              key={i}
              size={14}
              className={i < Math.floor(review.rating) ? 'fill-current' : 'text-yellow-200'}
            />
          ))}
        </div>
      </div>
      <p className="mt-2 text-sm leading-relaxed">{review.comment}</p>
    </div>
  )
}

export default ReviewItem
