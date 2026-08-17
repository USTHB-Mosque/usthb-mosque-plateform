import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface BookCardSkeletonProps {
  className?: string
}

const BookCardSkeleton: React.FC<BookCardSkeletonProps> = ({ className }) => {
  return (
    <article
      dir="rtl"
      className={cn(
        'relative flex h-full w-full flex-col items-center overflow-hidden rounded-xl border border-solid border-stroke-grey bg-fill-white',
        className,
      )}
    >
      <header className="relative flex h-48 w-full flex-none self-stretch overflow-hidden rounded-xl">
        <Skeleton className="absolute inset-0 rounded-none" />
        <Skeleton className="absolute top-4 right-4 z-10 h-7 w-16 flex-none rounded-lg bg-success-50" />
      </header>

      <div
        className="relative flex w-full flex-1 flex-col items-start gap-4 self-stretch p-4"
        style={{
          backgroundImage: 'url(/static/images/book-pattern.png)',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="relative flex w-full flex-none items-center justify-start gap-2.5 self-stretch">
          <Skeleton className="h-7 w-16 flex-none rounded-lg bg-primary/15" />
          <Skeleton className="h-7 w-16 flex-none rounded-lg bg-primary/15" />
        </div>
        <div className="relative flex w-full flex-none flex-col items-start gap-0.5 self-stretch">
          <Skeleton className="h-5 w-[70%]" />
          <div className="relative flex w-full flex-none items-center justify-start gap-2 self-stretch">
            <Skeleton className="h-4 w-4 flex-none rounded-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
        <div className="relative flex w-full flex-none flex-col items-start gap-4 self-stretch">
          <div className="h-px w-full self-stretch rounded-[5px] bg-stroke-grey" aria-hidden="true" />
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
      </div>
    </article>
  )
}

export default BookCardSkeleton
