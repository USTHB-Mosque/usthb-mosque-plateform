'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Loader2, Plus, Search, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { USER_SITUATION_LABELS } from '@/utils/constants/users'
import { LIBRARY_CARD_STATUS_LABELS } from '@/utils/constants/library-cards'
import { issueCard } from '@/features/admin/server/cards'
import { adminCardsKeys, useCardCandidatesQuery } from '@/features/admin/api/cards.queries'

interface AddCardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * "إضافة بطاقة" (#145). Cards are minted automatically on verification, so this
 * is the repair flow: pick a verified member and either the one card they were
 * missing is issued, or a withdrawn one is put back in service. Only a member who
 * already holds an *active* card is blocked, so the action the server would
 * refuse is never offered in the first place.
 */
const AddCardDialog: React.FC<AddCardDialogProps> = ({ open, onOpenChange }) => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [pending, startTransition] = useTransition()

  const { data: candidates = [], isFetching } = useCardCandidatesQuery(search, open)

  const close = () => {
    setSearch('')
    onOpenChange(false)
  }

  const handleIssue = (userId: number) => {
    startTransition(async () => {
      const result = await issueCard(userId)
      if (!result.ok) {
        toast.error(result.error ?? 'تعذر إصدار البطاقة')
        return
      }
      toast.success(`تم إصدار البطاقة ${result.cardId}`)
      close()
      queryClient.invalidateQueries({ queryKey: adminCardsKeys.root })
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle className="font-alyamama text-lg">إضافة بطاقة</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ابحث بالاسم أو البريد الإلكتروني ..."
            aria-label="بحث عن عضو"
            className="ps-9"
          />
        </div>

        <div className="max-h-72 overflow-y-auto">
          {candidates.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {isFetching ? 'جارٍ البحث ...' : 'لا يوجد أعضاء موثقون مطابقون'}
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {candidates.map((candidate) => (
                <li key={candidate.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-main-15 text-primary-300">
                      <UserRound className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {candidate.fullName || candidate.email}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {candidate.email}
                        {candidate.cardStatus
                          ? ` — بطاقة ${LIBRARY_CARD_STATUS_LABELS[candidate.cardStatus]}`
                          : ''}
                        {candidate.situation
                          ? ` — ${USER_SITUATION_LABELS[candidate.situation]}`
                          : ''}
                      </p>
                    </div>
                  </div>

                  {candidate.cardStatus === 'active' ? (
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                      <CheckCircle2 className="size-3.5" />
                      لديه بطاقة فعالة
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      disabled={pending}
                      onClick={() => handleIssue(candidate.id)}
                      aria-label={`إصدار بطاقة لـ ${candidate.fullName || candidate.email}`}
                    >
                      {pending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Plus className="size-4" />
                      )}
                      {candidate.cardStatus ? 'إعادة الإصدار' : 'إصدار'}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={pending}>
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AddCardDialog
