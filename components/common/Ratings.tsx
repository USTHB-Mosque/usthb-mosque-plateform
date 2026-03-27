import React from 'react'
import { Star, StarHalf } from 'lucide-react'

interface RatingsProps {
  averageRating: number
  ratingCount: number
}

const Ratings: React.FC<RatingsProps> = ({ averageRating, ratingCount }) => {
  const stars = Array.from({ length: 5 }, (_, i) => i + 1)
  return (
    <div className="flex items-center gap-2.5">
      <div className="font-bold text-lg pt-1 leading-none">{averageRating}</div>
      <div className="flex">
        {stars.map((star) => {
          const isFull = averageRating >= star
          const isHalf = averageRating >= star - 0.5 && averageRating < star

          return (
            <div key={star} className="relative text-yellow-400 px-0.5">
              <Star size={18} strokeWidth={2} className="text-yellow-400" />

              {(isFull || isHalf) && (
                <div
                  className="absolute inset-0 px-0.5"
                  style={{
                    clipPath: isHalf ? 'inset(0 0 0 50%)' : 'none',
                  }}
                >
                  <Star size={18} fill="currentColor" strokeWidth={2} />
                </div>
              )}
            </div>
          )
        })}
      </div>
      <p className="pt-1 leading-none">({ratingCount} تقييم)</p>
    </div>
  )
}

export default Ratings
