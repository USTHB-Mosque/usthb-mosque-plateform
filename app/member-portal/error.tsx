'use client'

import { useEffect } from 'react'
import SegmentError from '@/shared/common/SegmentError'

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
    <SegmentError
      reset={reset}
      fallbackSentence="حدث خطأ غير متوقع. يمكنك إعادة المحاولة أو العودة إلى لوحة التحكم."
    />
  )
}
