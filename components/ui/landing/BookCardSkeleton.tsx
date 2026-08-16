import React from 'react'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface BookCardSkeletonProps {
  className?: string
}

const BookCardSkeleton: React.FC<BookCardSkeletonProps> = ({ className }) => {
  return (
    <Card className={cn('flex flex-col justify-between', className)}>
      <CardContent className="p-0">
        <div className="relative h-48 lg:h-36">
          <Skeleton className="w-full h-full rounded-t-xl rounded-b-none" />
        </div>
        <div
          className="flex flex-col gap-4 p-4"
          style={{
            backgroundImage: 'url(/static/images/book-pattern.png)',
          }}
        >
          <div className="flex gap-2.5">
            <Skeleton className="h-6 w-14 rounded-full bg-primary/15" />
            <Skeleton className="h-6 w-14 rounded-full bg-primary/15" />
          </div>
          <div className="flex flex-col gap-0.5">
            <Skeleton className="h-4 w-3/4" />
            <div className="flex items-center gap-2 mt-2">
              <Skeleton className="w-4 h-4 rounded-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Skeleton className="h-10 w-full rounded-md" />
      </CardFooter>
    </Card>
  )
}

export default BookCardSkeleton