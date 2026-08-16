import React from 'react'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const ArticleCardSkeleton: React.FC = () => {
  return (
    <Card className="overflow-hidden w-full">
      <CardContent className="p-0">
        <div className="relative h-55 overflow-hidden">
          <Skeleton className="absolute top-3 right-3 z-10 w-24 h-6 rounded-md" />
          <Skeleton className="w-full h-full rounded-none" />
        </div>
        <div
          className="flex flex-col gap-2 p-3"
          style={{
            backgroundImage: 'url(/static/images/book-pattern.png)',
          }}
        >
          <div className="flex gap-1.5">
            <Skeleton className="h-4 w-12 rounded-full bg-primary/15" />
            <Skeleton className="h-4 w-12 rounded-full bg-primary/15" />
          </div>
          <Skeleton className="h-5 w-[80%]" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-[70%]" />
        </div>
      </CardContent>
      <CardFooter className="pt-5 px-3 pb-3">
        <Skeleton className="h-8 w-full rounded-md" />
      </CardFooter>
    </Card>
  )
}

export default ArticleCardSkeleton