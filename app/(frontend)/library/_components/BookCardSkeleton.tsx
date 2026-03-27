import React from 'react'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const BookCardSkeleton: React.FC = () => {
  return (
    <Card className={'flex flex-col justify-between overflow-hidden'}>
      <CardContent className="p-0">
        <Skeleton className={'w-full h-50 rounded-b-xl rounded-t-none'} />

        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-wrap gap-2.5">
            <Skeleton className="h-7 w-16 rounded-md bg-primary/10" />
            <Skeleton className="h-7 w-20 rounded-md bg-primary/10" />
          </div>

          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-3/4" />

            <div className="flex items-center gap-2">
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
