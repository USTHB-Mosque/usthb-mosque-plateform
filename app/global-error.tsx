'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  return (
    <html lang="ar" dir="ltr">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
          <h1 className="text-4xl font-bold">خطأ غير متوقع</h1>
          <p className="text-lg text-muted-foreground max-w-md">
            حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى أو تحديث الصفحة.
          </p>
          <button
            onClick={() => reset()}
            className="rounded-lg bg-primary px-6 py-2 text-white hover:bg-primary/90"
          >
            إعادة المحاولة
          </button>
        </div>
      </body>
    </html>
  )
}
