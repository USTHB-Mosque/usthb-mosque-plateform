'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { arDZ } from 'date-fns/locale'
import { BookOpen, Check, MessageSquareQuote, Star, Timer, X } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import ConfirmDialog from '@/shared/ui/confirm-dialog'
import { approveExtension, refuseExtension } from '@/features/admin/server/extensions'
import type {
  AdminUserBorrowing,
  AdminUserExtension,
  AdminUserReview,
} from '@/features/admin/server/users'

/**
 * #156: the three timelines SPEC §7.3 puts on the user page — previous
 * borrowings with their returned state, the member's reviews, and their
 * extension requests with the due-check an admin decides against.
 *
 * The extension decision lives here rather than being repeated: the queue screen
 * (#144) and this view call the same two server actions, so a pending request
 * is reachable from either place and behaves identically from both.
 */

const LOAN_STATUS_LABELS: Record<string, string> = {
  pending: 'قيد الانتظار',
  accepted: 'مقبول',
  picked_up: 'تم الأخذ',
  returned: 'مُسترجع',
  refused: 'مرفوض',
  cancelled: 'ملغى',
}

const RETURNED_LABELS: Record<'returned' | 'notReturned', string> = {
  returned: 'مُسترجع',
  notReturned: 'لم يُسترجع',
}

const EXTENSION_STATUS_LABELS: Record<string, string> = {
  pending: 'قيد المراجعة',
  approved: 'مقبول',
  refused: 'مرفوض',
  withdrawn: 'مسحوب',
}

const EXTENSION_STATUS_CLASSES: Record<string, string> = {
  pending: 'border-primary/30 bg-primary/10 text-primary-300',
  approved:
    'border-emerald-200 bg-emerald-500/10 text-emerald-600 dark:border-emerald-400/30 dark:text-emerald-300',
  refused: 'border-destructive/30 bg-destructive/10 text-destructive dark:border-destructive/40',
  withdrawn: 'border-border bg-background-2 text-muted-foreground',
}

const REVIEW_KIND_LABELS = { book: 'كتاب', article: 'مقال' } as const

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  return format(new Date(value), 'd MMM yyyy', { locale: arDZ })
}

function Section({
  title,
  icon: Icon,
  children,
}: React.PropsWithChildren<{ title: string; icon: React.ElementType }>) {
  return (
    <Card className="rounded-2xl border border-border ring-0">
      <CardContent className="flex flex-col gap-4 p-5">
        <h3 className="flex items-center gap-2 text-lg font-bold font-dubai text-foreground">
          <Icon className="size-5 text-primary-300" />
          {title}
        </h3>
        {children}
      </CardContent>
    </Card>
  )
}

interface UserHistoryProps {
  history: {
    borrowings: { docs: AdminUserBorrowing[]; total: number }
    reviews: { docs: AdminUserReview[]; total: number }
    extensions: { docs: AdminUserExtension[] }
  }
}

export default function UserHistory({ history }: UserHistoryProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [approving, setApproving] = useState<AdminUserExtension | null>(null)
  const [refusing, setRefusing] = useState<AdminUserExtension | null>(null)

  const decide = (
    target: AdminUserExtension | null,
    action: typeof approveExtension,
    successMessage: string,
    fallbackError: string,
  ) => {
    if (!target) return
    startTransition(async () => {
      const result = await action(target.id)
      if (result.ok) {
        toast.success(successMessage)
        router.refresh()
      } else {
        toast.error(result.error || fallbackError)
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <Section title="الإعارات السابقة" icon={BookOpen}>
        {history.borrowings.docs.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">لا توجد إعارات سابقة</p>
        ) : (
          <>
            <ul className="flex flex-col divide-y divide-border" data-testid="borrowings-list">
              {history.borrowings.docs.map((loan) => (
                <li key={loan.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-card-foreground">
                      {loan.title || 'كتاب محذوف'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      طلب {formatDate(loan.loanDate)} · موعد الإرجاع {formatDate(loan.dueDate)}
                    </p>
                  </div>
                  <Badge variant="outline">{LOAN_STATUS_LABELS[loan.status]}</Badge>
                  <Badge
                    data-state={loan.returned ? 'returned' : 'not-returned'}
                    className={
                      loan.returned
                        ? 'bg-[#00FF92]/15 text-[#0B7A4B] dark:text-[#7dffc4]'
                        : 'bg-[#FFB020]/15 text-[#B45309] dark:text-[#ffcaa2]'
                    }
                  >
                    {RETURNED_LABELS[loan.returned ? 'returned' : 'notReturned']}
                  </Badge>
                </li>
              ))}
            </ul>
            {history.borrowings.total > history.borrowings.docs.length ? (
              <p className="text-xs text-muted-foreground">
                عرض آخر {history.borrowings.docs.length} من {history.borrowings.total} إعارة.
              </p>
            ) : null}
          </>
        )}
      </Section>

      <Section title="التقييمات" icon={MessageSquareQuote}>
        {history.reviews.docs.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">لا توجد تقييمات</p>
        ) : (
          <>
            <ul className="flex flex-col divide-y divide-border" data-testid="reviews-list">
              {history.reviews.docs.map((review) => (
                <li key={review.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-card-foreground">
                      «{review.targetTitle || 'هدف محذوف'}»
                    </p>
                    {review.comment ? (
                      <p className="truncate text-xs text-muted-foreground">{review.comment}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground/60">بدون تعليق</p>
                    )}
                  </div>
                  <Badge data-kind={review.targetType} variant="secondary">
                    {REVIEW_KIND_LABELS[review.targetType]}
                  </Badge>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="size-3.5 fill-amber-400 text-amber-400" />
                    {review.rating}/5
                  </span>
                </li>
              ))}
            </ul>
            {history.reviews.total > history.reviews.docs.length ? (
              <p className="text-xs text-muted-foreground">
                عرض آخر {history.reviews.docs.length} من {history.reviews.total} تقييماً.
              </p>
            ) : null}
          </>
        )}
      </Section>

      <Section title="طلبات التمديد" icon={Timer}>
        {history.extensions.docs.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">لا توجد طلبات تمديد</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border" data-testid="extensions-list">
            {history.extensions.docs.map((extension) => {
              const state = extension.status
              return (
                <li key={extension.id} className="flex flex-col gap-2 py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-card-foreground">
                      {extension.bookTitle || 'إعارة محذوفة'}
                    </p>
                    <Badge variant="outline" className={EXTENSION_STATUS_CLASSES[state]}>
                      {EXTENSION_STATUS_LABELS[state] ?? state}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="border-primary/30 bg-primary/10 text-primary-300"
                    >
                      ‎+{extension.days} يوم
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(extension.originalDueDate)} ← {formatDate(extension.newDueDate)}
                    {extension.reason ? ` · ${extension.reason}` : ''}
                  </p>
                  {/* SPEC §7.3 due-check: the queue decides whether an extension
                      costs the library anything, and it is the same queue the
                      member's own auto-approval is measured against. */}
                  <p className="text-xs text-muted-foreground">
                    {extension.waitingForBook === 0
                      ? 'لا أحد ينتظر هذا الكتاب — الإعارة متاحة.'
                      : `${extension.waitingForBook} أعضاء في قائمة الانتظار — التمديد يؤخّر المستفيدين.`}
                  </p>
                  {state === 'pending' ? (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => setApproving(extension)}
                      >
                        <Check className="size-4" />
                        قبول تمديد
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => setRefusing(extension)}
                      >
                        <X className="size-4" />
                        رفض التمديد
                      </Button>
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </Section>

      <ConfirmDialog
        open={approving !== null}
        onOpenChange={(open) => (open ? null : setApproving(null))}
        title="قبول طلب التمديد"
        description={
          approving
            ? `سيتم تمديد إرجاع «${approving.bookTitle ?? 'الكتاب'}» إلى ${formatDate(approving.newDueDate)} وإشعار العضو.`
            : ''
        }
        confirmLabel="تأكيد القبول"
        busy={pending}
        onConfirm={() =>
          decide(approving, approveExtension, 'تم قبول طلب التمديد', 'تعذر قبول الطلب')
        }
      />

      <ConfirmDialog
        open={refusing !== null}
        onOpenChange={(open) => (open ? null : setRefusing(null))}
        title="رفض طلب التمديد"
        description={
          refusing
            ? `سيتم رفض طلب تمديد «${refusing.bookTitle ?? 'الكتاب'}» دون تغيير موعد الإرجاع.`
            : ''
        }
        confirmLabel="تأكيد الرفض"
        busy={pending}
        onConfirm={() => decide(refusing, refuseExtension, 'تم رفض طلب التمديد', 'تعذر رفض الطلب')}
      />
    </div>
  )
}
