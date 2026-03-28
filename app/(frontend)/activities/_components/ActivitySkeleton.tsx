import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const ActivitySkeleton: React.FC = () => {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0 flex flex-col md:flex-row">
        <Skeleton className="w-full h-100vh flex-1 rounded-none" />

        <div className="flex-2 flex flex-col justify-between p-8 space-y-6">
          <div>
            <div className="mb-6 flex items-center gap-2.5">
              <Skeleton className="size-6 rounded-full" />
              <Skeleton className="h-5 w-32" />
            </div>
            <Skeleton className="h-8 w-3/4 mb-4" />

            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>

          <div className="pt-4">
            <Skeleton className="h-10 w-40 rounded-md" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default ActivitySkeleton
