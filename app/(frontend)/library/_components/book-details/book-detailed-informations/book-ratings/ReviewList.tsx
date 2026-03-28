'use client'

import React, { useEffect, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import type { PaginatedDocs } from 'payload'
import type { InfiniteData } from '@tanstack/react-query'
import ReviewItem from './ReviewItem'
import { Review } from '@/payload-types'
import { useGetInfiniteReviewsQuery } from '@/lib/apis/reviews/queries'

interface ReviewListProps {
  initialPage: PaginatedDocs<Review>
  bookId: number
}

const ReviewList: React.FC<ReviewListProps> = ({ initialPage, bookId }) => {
  const [initialInfiniteData] = useState<InfiniteData<PaginatedDocs<Review>, number>>(() => ({
    pages: [initialPage],
    pageParams: [initialPage.page ?? 1],
  }))

  const { ref, inView } = useInView()

  const {
    data,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage: canFetchMore,
  } = useGetInfiniteReviewsQuery(bookId, initialInfiniteData)

  useEffect(() => {
    if (inView && canFetchMore && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, canFetchMore, isFetchingNextPage, fetchNextPage])

  const allReviews = data?.pages.flatMap((page) => page.docs) || []

  return (
    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
      {allReviews.map((review) => (
        <ReviewItem key={review.id} review={review} />
      ))}

      <div ref={ref} className="h-10 flex items-center justify-center">
        {isFetchingNextPage && (
          <span className="text-xs text-muted-foreground">جاري تحميل المزيد...</span>
        )}
      </div>
    </div>
  )
}

export default ReviewList
