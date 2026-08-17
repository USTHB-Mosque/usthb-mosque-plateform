import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'

const ArticleCardSkeleton: React.FC = () => {
  return (
    <article
      dir="rtl"
      className="flex h-full w-full flex-col items-center gap-5 overflow-hidden rounded-xl border border-solid border-stroke-grey bg-fill-white px-0 pt-0 pb-4"
    >
      <header className="relative flex h-[200px] w-full items-start justify-start gap-2.5 self-stretch overflow-hidden rounded-xl p-4">
        <Skeleton className="absolute inset-0 rounded-none" />
        <Skeleton className="relative z-10 h-8 w-28 flex-none rounded-lg bg-[#2a3a4cb2]" />
      </header>

      <div
        className="relative flex w-full flex-1 flex-col items-start gap-6 self-stretch px-4 py-0"
        style={{
          backgroundImage: 'url(/static/images/book-pattern.png)',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <section
          className="relative flex w-full flex-1 flex-col items-start gap-2 self-stretch"
          aria-label="معلومات المقال"
        >
          <div className="relative flex w-full flex-none items-center justify-start gap-2.5 self-stretch px-4 py-0">
            <Skeleton className="h-7 w-16 flex-none rounded-lg bg-primary/15" />
            <Skeleton className="h-7 w-16 flex-none rounded-lg bg-primary/15" />
          </div>
          <div className="relative flex w-full flex-none flex-col items-start gap-2 self-stretch">
            <div className="relative flex w-full flex-none items-center justify-center gap-2.5 self-stretch px-4 py-0">
              <Skeleton className="h-6 w-[75%]" />
            </div>
            <div className="relative flex w-full flex-none flex-col items-start justify-center gap-2 self-stretch px-4 py-0">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[60%]" />
            </div>
          </div>
        </section>

        <footer className="relative flex w-full flex-none flex-col items-start gap-6 self-stretch">
          <div className="h-px w-full self-stretch rounded-[5px] bg-stroke-grey" aria-hidden="true" />
          <Skeleton className="h-11 w-full rounded-lg" />
        </footer>
      </div>
    </article>
  )
}

export default ArticleCardSkeleton
