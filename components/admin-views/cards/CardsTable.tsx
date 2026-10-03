'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { arDZ } from 'date-fns/locale'
import { Archive, ArchiveRestore, Ban, MoreVertical } from 'lucide-react'
import { toast } from 'sonner'
import type { LibraryCard, Media, User } from '@/payload-types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { Badge } from '@/shared/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { userSituationsConfigArray } from '@/utils/constants/users'
import { LIBRARY_CARD_STATUS_LABELS, type LibraryCardStatus } from '@/utils/constants/library-cards'
import { getImageUrl } from '@/shared/lib/image-utils'
import { setCardStatus } from '@/features/admin/server/cards'
import { adminCardsKeys } from '@/features/admin/api/cards.queries'

const STATUS_BADGE: Record<LibraryCardStatus, string> = {
  active: 'bg-[#00FF92] text-[#243245] rounded-lg',
  inactive: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 rounded-lg',
  archived: 'bg-muted text-muted-foreground rounded-lg',
}

const SITUATION_LABELS: Record<string, string> = Object.fromEntries(
  userSituationsConfigArray.map((option) => [option.value, option.label]),
)

/** depth 2 populated these; a plain id means the relation was not resolved. */
function holder(card: LibraryCard): User | undefined {
  return typeof card.user === 'object' && card.user !== null ? (card.user as User) : undefined
}

function holderPhoto(card: LibraryCard): string | undefined {
  const user = holder(card)
  const picture = user?.profilePicture
  const media = typeof picture === 'object' && picture !== null ? (picture as Media) : undefined
  return media?.url ? getImageUrl(media.url) : undefined
}

function holderName(card: LibraryCard): string {
  const user = holder(card)
  if (!user) return '—'
  return user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
}

type Transition = {
  status: LibraryCardStatus
  label: string
  icon: typeof Archive
  /** What the admin is telling the member, and what the toast says. */
  done: string
}

/**
 * Only the transitions that change something are offered. An archived card has
 * exactly one way out, and an active one has no way back into `archived` from
 * here without going through the withdrawal first — the menu mirrors the model
 * in `utils/constants/library-cards.ts` instead of listing all three states.
 */
const TRANSITIONS: Record<LibraryCardStatus, Transition[]> = {
  active: [
    { status: 'inactive', label: 'سحب البطاقة', icon: Ban, done: 'تم سحب البطاقة' },
    { status: 'archived', label: 'أرشفة البطاقة', icon: Archive, done: 'تمت أرشفة البطاقة' },
  ],
  inactive: [
    {
      status: 'active',
      label: 'إعادة البطاقة للخدمة',
      icon: ArchiveRestore,
      done: 'أُعيدت البطاقة للخدمة',
    },
    { status: 'archived', label: 'أرشفة البطاقة', icon: Archive, done: 'تمت أرشفة البطاقة' },
  ],
  archived: [
    {
      status: 'active',
      label: 'إعادة البطاقة للخدمة',
      icon: ArchiveRestore,
      done: 'أُعيدت البطاقة للخدمة',
    },
  ],
}

const CardsTable: React.FC<{ cards: LibraryCard[] }> = ({ cards }) => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [pending, startTransition] = useTransition()
  const [busyCardId, setBusyCardId] = useState<number | null>(null)

  const run = (card: LibraryCard, transition: Transition) => {
    setBusyCardId(card.id)
    startTransition(async () => {
      const result = await setCardStatus(card.id, transition.status)
      setBusyCardId(null)
      if (!result.ok) {
        toast.error(result.error ?? 'تعذر تنفيذ العملية')
        return
      }
      toast.success(transition.done)
      queryClient.invalidateQueries({ queryKey: adminCardsKeys.root })
      router.refresh()
    })
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>معرف البطاقة</TableHead>
          <TableHead>الإسم واللقب</TableHead>
          <TableHead>الوضعية</TableHead>
          <TableHead>الصورة</TableHead>
          <TableHead>تاريخ الإنشاء</TableHead>
          <TableHead>الحالة</TableHead>
          <TableHead className="w-10 text-end">
            <span className="sr-only">إجراءات</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {cards.map((card) => {
          const status = card.status ?? 'active'
          const photo = holderPhoto(card)
          const name = holderName(card)
          const transitions = TRANSITIONS[status]

          return (
            <TableRow key={card.id}>
              <TableCell className="font-medium">{card.cardId}</TableCell>
              <TableCell>{name}</TableCell>
              <TableCell className="text-muted-foreground">
                {SITUATION_LABELS[holder(card)?.situation ?? ''] ?? '—'}
              </TableCell>
              <TableCell>
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo}
                    alt={`صورة ${name}`}
                    className="size-9 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {card.createdAt
                  ? format(new Date(card.createdAt), 'd MMM yyyy', { locale: arDZ })
                  : '—'}
              </TableCell>
              <TableCell>
                <Badge className={STATUS_BADGE[status]}>{LIBRARY_CARD_STATUS_LABELS[status]}</Badge>
              </TableCell>
              <TableCell className="text-end">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    aria-label={`إجراءات البطاقة ${card.cardId}`}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary-300"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" sideOffset={6} className="min-w-48">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>{card.cardId}</DropdownMenuLabel>
                      {transitions.map((transition, index) => (
                        <React.Fragment key={transition.status}>
                          {index > 0 ? <DropdownMenuSeparator /> : null}
                          <DropdownMenuItem
                            variant={transition.status === 'archived' ? 'destructive' : 'default'}
                            disabled={pending && busyCardId === card.id}
                            onClick={() => run(card, transition)}
                          >
                            <transition.icon className="size-4" />
                            {transition.label}
                          </DropdownMenuItem>
                        </React.Fragment>
                      ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

export default CardsTable
