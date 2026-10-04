'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Textarea } from '@/shared/ui/textarea'
import { leaveActivityFeedback } from '../server/feedback'

export default function ActivityFeedbackPanel({
  activityId,
  positive,
  negative,
  canLeaveFeedback,
  initialSentiment,
  initialComment,
}: {
  activityId: number
  positive: number
  negative: number
  canLeaveFeedback: boolean
  initialSentiment?: 'positive' | 'negative'
  initialComment?: string
}) {
  const router = useRouter()
  const [sentiment, setSentiment] = useState<'positive' | 'negative' | null>(
    initialSentiment ?? null,
  )
  const [comment, setComment] = useState(initialComment ?? '')
  const [pending, startTransition] = useTransition()

  return (
    <Card dir="rtl" className="border border-border bg-card ring-0">
      <CardHeader>
        <CardTitle className="font-alyamama text-xl">آراء المشاركين</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3 text-sm" aria-label="ملخص آراء المشاركين">
          <span className="rounded-lg bg-primary/10 px-3 py-2 text-primary-300">
            {positive} إيجابي
          </span>
          <span className="rounded-lg bg-muted px-3 py-2 text-muted-foreground">
            {negative} سلبي
          </span>
        </div>
        {canLeaveFeedback && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">ما رأيك في النشاط؟</p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={sentiment === 'positive' ? 'default' : 'outline'}
                aria-pressed={sentiment === 'positive'}
                onClick={() => setSentiment('positive')}
              >
                إيجابي
              </Button>
              <Button
                type="button"
                variant={sentiment === 'negative' ? 'default' : 'outline'}
                aria-pressed={sentiment === 'negative'}
                onClick={() => setSentiment('negative')}
              >
                سلبي
              </Button>
            </div>
            <label className="block space-y-2 text-sm">
              تعليق (اختياري)
              <Textarea value={comment} onChange={(event) => setComment(event.target.value)} />
            </label>
            <Button
              disabled={!sentiment || pending}
              onClick={() =>
                startTransition(async () => {
                  if (!sentiment) return
                  const result = await leaveActivityFeedback(activityId, sentiment, comment)
                  if (result.ok) {
                    toast.success('تم حفظ تقييمك')
                    router.refresh()
                  } else toast.error(result.error)
                })
              }
            >
              {initialSentiment ? 'تحديث التقييم' : 'إرسال التقييم'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
