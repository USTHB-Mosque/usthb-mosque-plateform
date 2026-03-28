import React from 'react'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const ArticleSkeleton: React.FC = () => {
  return (
    <Card className={'flex flex-col justify-between overflow-hidden'}>
      <CardContent className="p-0">
        <div className="relative">
          <Skeleton className="absolute top-4 right-4 w-24 h-7 rounded-md bg-secondary/20 z-10" />

          <Skeleton className="w-full h-50 rounded-none" />
        </div>

        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-wrap gap-2.5">
            <Skeleton className="h-6 w-16 rounded-full bg-primary/10" />
            <Skeleton className="h-6 w-20 rounded-full bg-primary/10" />
          </div>

          <div className="flex flex-col gap-2">
            <Skeleton className="h-7 w-[80%]" />

            <div className="space-y-2 mt-1">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[90%]" />
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-4">
        <Skeleton className="h-10 w-full rounded-md" />
      </CardFooter>
    </Card>
  )
}

export default ArticleSkeleton
