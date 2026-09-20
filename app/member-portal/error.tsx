'use client'

import { useEffect } from 'react'

export default function MemberPortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Member portal segment error:', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="font-khalid text-3xl text-secondary sm:text-4xl">حدث خطأ في هذه الصفحة</h1>
      <p className="max-w-md text-lg text-muted-foreground">
        حدث خطأ غير متوقع. يمكنك إعادة المحاولة أو العودة إلى لوحة التحكم.
      </p>
      <button
        onClick={() => reset()}
        className="rounded-full bg-primary px-8 py-2 text-white hover:bg-primary/90"
      >
        إعادة المحاولة
      </button>
    </div>
  )
}
