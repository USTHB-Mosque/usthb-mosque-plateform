import React from 'react'

type SegmentErrorProps = React.PropsWithChildren<{
  fallbackSentence: string
  reset: () => void
}>

/**
 * Content of a Next.js segment error boundary (app/…/error.tsx). The
 * boundary file itself must stay local to its route segment; only this
 * presentational component is shared. Direction (RTL) comes from the root
 * shell, like every other page-level component.
 */
const SegmentError: React.FC<SegmentErrorProps> = ({ fallbackSentence, reset }) => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-8 text-center">
    <h1 className="font-khalid text-3xl text-secondary sm:text-4xl">حدث خطأ في هذه الصفحة</h1>
    <p className="max-w-md text-lg text-muted-foreground">{fallbackSentence}</p>
    <button
      onClick={() => reset()}
      className="rounded-full bg-primary px-8 py-2 text-white hover:bg-primary/90"
    >
      إعادة المحاولة
    </button>
  </div>
)

export default SegmentError
