import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const gradientOverlay = 'linear-gradient(to top, #243245 0%, #243245c0 50%, #24324553 100%)'

interface ActivityCardSkeletonProps {
  className?: string
  large?: boolean
}

const ActivityCardSkeleton: React.FC<ActivityCardSkeletonProps> = ({ className, large = false }) => {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl min-h-[220px]',
        large && 'md:min-h-[320px]',
        className,
      )}
    >
      <Skeleton className="absolute inset-0 w-full h-full rounded-none" />

      <div
        className="absolute inset-0 z-[3] flex flex-col justify-end gap-5 p-5"
        style={{ background: gradientOverlay }}
      >
        <div className="self-start">
          <Skeleton className="h-7 w-24 rounded-lg" />
        </div>

        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    </div>
  )
}

export default ActivityCardSkeleton