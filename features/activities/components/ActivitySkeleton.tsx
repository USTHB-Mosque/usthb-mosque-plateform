import React from 'react'
import { Skeleton } from '@/shared/ui/skeleton'

const ActivitySkeleton: React.FC = () => {
  return (
    <article
      dir="rtl"
      className="relative flex h-[390px] w-full items-start justify-start overflow-hidden rounded-2xl border border-solid border-stroke-grey bg-fill-main"
    >
      <div className="relative h-full w-[45%] max-w-[500px] flex-none shrink-0 self-stretch border-e border-e-stroke-grey sm:w-[40%]">
        <Skeleton className="absolute inset-0 rounded-none" />
        <Skeleton className="absolute top-[18px] end-[18px] z-10 h-7 w-16 flex-none rounded-lg bg-success-50" />
      </div>

      <div className="relative flex flex-1 grow flex-col items-start justify-between self-stretch px-6 py-5 pt-6 pb-7 md:px-8">
        <div className="relative flex w-full flex-none flex-col items-start gap-4 self-stretch">
          <section className="relative flex w-full flex-col items-start gap-3 self-stretch">
            <div className="flex flex-wrap items-start justify-start gap-2 self-stretch">
              <Skeleton className="h-7 w-16 flex-none rounded-lg bg-primary/15" />
            </div>
            <Skeleton className="h-7 w-[70%] self-start rounded-md" />
            <Skeleton className="h-4 w-full self-start" />
            <Skeleton className="h-4 w-3/4 self-start" />
            <div className="grid h-fit w-full grid-cols-2 gap-[10px_16px] rounded-[10px] border border-solid border-stroke-grey bg-fill-contrast p-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex h-full w-full items-center justify-start gap-1.5">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-5 flex-none rounded-full" />
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="relative flex w-full flex-none items-center justify-between self-stretch px-2 py-0">
          <div className="inline-flex items-center gap-5">
            <Skeleton className="h-[18px] w-12" />
            <Skeleton className="h-[18px] w-12" />
          </div>
          <div className="inline-flex items-center gap-5">
            <Skeleton className="h-[18px] w-[18px] rounded-full" />
            <Skeleton className="h-[18px] w-[18px] rounded-full" />
          </div>
        </div>
      </div>
    </article>
  )
}

export default ActivitySkeleton