'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/shared/ui/button'
import { sendBulkEmailDigest } from '../server/send-digest'

export default function DigestButton() {
  const [pending, startTransition] = useTransition()
  return (
    <Button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            const { sent } = await sendBulkEmailDigest()
            toast.success(`تم إرسال الملخص إلى ${sent} عضو`)
          } catch {
            toast.error('تعذر إرسال الملخص')
          }
        })
      }
    >
      {pending ? 'جار الإرسال…' : 'إرسال ملخص الأنشطة والمقالات'}
    </Button>
  )
}
