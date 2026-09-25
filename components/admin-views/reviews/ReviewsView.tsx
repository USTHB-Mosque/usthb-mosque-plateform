'use client'

import React, { useCallback, useState, useTransition } from 'react'
import { Card, CardContent } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui/dialog'
import { Badge } from '@/shared/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/ui/tabs'
import StatCards from '@/components/admin-views/shared/StatCards'
import { MessageSquareQuote, ThumbsUp, ThumbsDown, Trash2, Star } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { arDZ } from 'date-fns/locale'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import type { Review, User } from '@/payload-types'
import {
  deleteReview,
  getAdminReviews,
  getReviewKpis,
  type ReviewsQuery,
} from '@/features/admin/server/reviews'

type Kpis = Awaited<ReturnType<typeof getReviewKpis>>
type ReviewPage = Awaited<ReturnType<typeof getAdminReviews>>

const situationLabels: Record<string, string> = {
  student: 'طالب',
  doctoral: 'طالب دكتوراه',
  teacher: 'أستاذ',
  staff: 'موظف',
}

function userName(user: User | number): string {
  if (typeof user === 'number') return `#${user}`
  return user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
}

function targetTitle(review: Review): { title: string; detail: string; kind: 'كتاب' | 'مقال' } {
  if (typeof review.book === 'object' && review.book) {
    return { title: review.book.title, detail: review.book.author, kind: 'كتاب' }
  }
  if (typeof review.article === 'object' && review.article) {
    return { title: review.article.title, detail: review.article.author, kind: 'مقال' }
  }
  return { title: '—', detail: '', kind: 'كتاب' }
}

interface ReviewsViewProps {
  initialKpis: Kpis
  initialReviews: ReviewPage
}

export default function ReviewsView({ initialKpis, initialReviews }: ReviewsViewProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [kpis, setKpis] = useState<Kpis>(initialKpis)
  const [sections, setSections] = useState<Record<string, ReviewPage>>({
    all: initialReviews,
  })
  const [confirmTarget, setConfirmTarget] = useState<Review | null>(null)

  const activeTarget = (targetType?: ReviewsQuery['targetType']) =>
    targetType === 'article' ? 'article' : targetType === 'book' ? 'book' : 'all'

  const loadSection = useCallback((targetType?: ReviewsQuery['targetType'], page = 1) => {
    startTransition(async () => {
      const [reviews, freshKpis] = await Promise.all([
        getAdminReviews({ targetType, page, limit: 20 }),
        getReviewKpis(),
      ])
      setSections((prev) => {
        const key = activeTarget(targetType)
        const existing = prev[key] ?? { docs: [] as Review[], totalDocs: 0, totalPages: 0 }
        const docs = page > 1 ? [...existing.docs, ...reviews.docs] : reviews.docs
        return {
          ...prev,
          [key]: { ...reviews, docs, totalDocs: reviews.totalDocs, totalPages: reviews.totalPages },
        }
      })
      setKpis(freshKpis)
    })
  }, [])

  const handleDelete = (review: Review) => {
    startTransition(async () => {
      await deleteReview(review.id)
      setConfirmTarget(null)
      toast.success('تم حذف التقييم')
      router.refresh()
      loadSection()
      loadSection('book')
      loadSection('article')
    })
  }

  const kpiItems = [
    { label: 'إجمالي الآراء', value: kpis.totalReviews, icon: MessageSquareQuote },
    { label: 'آراء إيجابية', value: kpis.positiveReviews, icon: ThumbsUp },
    { label: 'نسبة الآراء الإيجابية', value: `${kpis.positivePercent}%`, icon: ThumbsUp },
    { label: 'نسبة الآراء السلبية', value: `${kpis.negativePercent}%`, icon: ThumbsDown },
  ]

  const renderList = (section: ReviewPage | undefined, targetType?: ReviewsQuery['targetType']) => {
    const docs = (section?.docs ?? []) as Review[]
    if (!pending && docs.length === 0) {
      return (
        <p className="py-8 text-center text-sm text-muted-foreground">
          لا توجد تقييمات في هذا القسم
        </p>
      )
    }
    return (
      <div className="flex flex-col gap-3">
        {docs.map((review) => {
          const target = targetTitle(review)
          return (
            <Card key={review.id} className="rounded-2xl">
              <CardContent className="flex items-start justify-between gap-4 p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{userName(review.user)}</span>
                    {typeof review.user === 'object' && review.user.situation && (
                      <Badge variant="secondary">
                        {situationLabels[review.user.situation] ?? review.user.situation}
                      </Badge>
                    )}
                    <Badge variant="outline">{target.kind}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(review.createdAt), {
                        addSuffix: true,
                        locale: arDZ,
                      })}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-primary">
                    «{target.title}»{target.detail ? ` — ${target.detail}` : ''}
                  </p>
                  <div className="mt-1 flex items-center gap-1">
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <Star key={i} className="size-3.5 fill-amber-400 text-amber-400" />
                    ))}
                    <span className="ms-1 text-xs text-muted-foreground">{review.rating}/5</span>
                  </div>
                  {review.comment ? (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                      {review.comment}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground/60">بدون تعليق</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="حذف التقييم"
                  onClick={() => setConfirmTarget(review)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          )
        })}
        {(section?.hasNextPage || (section?.totalPages ?? 0) > (section?.page ?? 1)) && (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => loadSection(targetType, (section?.page ?? 1) + 1)}
          >
            تحميل المزيد
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <StatCards items={kpiItems} />

      <Tabs
        defaultValue="all"
        onValueChange={(value) => {
          const targetType =
            value === 'book'
              ? ('book' as const)
              : value === 'article'
                ? ('article' as const)
                : undefined
          if (!sections[activeTarget(targetType)]) {
            startTransition(async () => {
              const reviews = await getAdminReviews({ targetType, page: 1, limit: 20 })
              setSections((prev) => ({ ...prev, [activeTarget(targetType)]: reviews }))
            })
          }
        }}
      >
        <TabsList>
          <TabsTrigger value="all">الكل</TabsTrigger>
          <TabsTrigger value="book">الكتب</TabsTrigger>
          <TabsTrigger value="article">المقالات</TabsTrigger>
        </TabsList>
        <TabsContent value="all">{renderList(sections.all)}</TabsContent>
        <TabsContent value="book">{renderList(sections.book, 'book')}</TabsContent>
        <TabsContent value="article">{renderList(sections.article, 'article')}</TabsContent>
      </Tabs>

      <Dialog
        open={confirmTarget !== null}
        onOpenChange={(open) => !open && setConfirmTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حذف التقييم</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            هل تريد بالتأكيد حذف هذا التقييم؟ لا يمكن التراجع عن هذا الإجراء.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmTarget(null)}>
              إلغاء
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => confirmTarget && handleDelete(confirmTarget)}
            >
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
