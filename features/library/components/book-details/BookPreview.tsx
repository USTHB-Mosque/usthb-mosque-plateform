'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/shared/ui/card'
import Image from 'next/image'
import Ratings from '@/shared/common/Ratings'
import { CheckCircle2, Link, ListOrdered } from 'lucide-react'
import { Book, Media } from '@/payload-types'
import { toast } from 'sonner'
import BookFavoriteButton from './BookFavoriteButton'
import BorrowDialog from './BorrowDialog'
import { getImageUrl } from '@/shared/lib/image-utils'
import { borrowBook, type UserBookLoanState } from '@/features/library/server/borrow-book'
import { useGetProfileQuery } from '@/features/auth'
import { Button } from '@/shared/ui/button'

interface BookPreviewProps {
  image: Book['image']
  averageRating: Book['averageRating']
  ratingCount: Book['ratingCount']
  isAvailable: boolean
  bookId: Book['id']
  initialFavorited: boolean
  bookTitle?: string
  /**
   * The signed-in member's relationship with this book. Absent on the public
   * page, where nobody is signed in and there is nothing to render (#153).
   */
  loanState?: UserBookLoanState
  adminMode?: boolean
  adminActions?: React.ReactNode
}

const DEFAULT_STATE: UserBookLoanState = {
  hasActiveLoan: false,
  waitlisted: false,
  waitlistPosition: null,
  remainingSlots: null,
  needsVerification: false,
}

const BookPreview: React.FC<BookPreviewProps> = ({
  image,
  averageRating,
  ratingCount,
  isAvailable,
  bookId,
  initialFavorited,
  bookTitle,
  loanState,
  adminMode = false,
  adminActions,
}) => {
  const media = image as Media
  const imageUrl = getImageUrl(media?.url)
  const router = useRouter()
  const [isBorrowing, setIsBorrowing] = useState(false)
  const [borrowDialogOpen, setBorrowDialogOpen] = useState(false)
  const { data: { user } = { user: undefined } } = useGetProfileQuery()

  const { hasActiveLoan, waitlisted, waitlistPosition, remainingSlots, needsVerification } =
    loanState ?? DEFAULT_STATE

  const onCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    toast.success('تم نسخ الرابط')
  }

  const handleJoinWaitlist = async () => {
    setIsBorrowing(true)
    const result = await borrowBook(bookId.toString())
    setIsBorrowing(false)

    if (result.success) {
      toast.success(result.message)
      // Re-read the page so the queue position replaces the join action.
      router.refresh()
    } else {
      toast.error(result.message)
    }
  }

  const handleBorrowClick = () => {
    if (!user) {
      router.push('/auth/login?redirect=/library/book/' + bookId)
      return
    }
    // No free copy: the request *is* joining the queue, and that needs no
    // period or date to pick. Previously this ended in a refusal toast.
    if (!isAvailable) {
      void handleJoinWaitlist()
      return
    }
    setBorrowDialogOpen(true)
  }

  const handleBorrowConfirm = async (data: { dueDate: string; pickupDate: string }) => {
    setIsBorrowing(true)
    const result = await borrowBook(bookId.toString(), data)
    setIsBorrowing(false)

    if (result.success) {
      toast.success(result.message)
      setBorrowDialogOpen(false)
      router.push('/user/my-loans')
    } else {
      toast.error(result.message)
    }
  }

  // The two reasons `checkRequestGates` can refuse a member who can see the
  // button. Waiting is allowed unverified — only collecting is not — so the
  // verification notice applies to the request path alone.
  const budgetExhausted = remainingSlots !== null && remainingSlots <= 0
  const mustVerify = needsVerification && isAvailable
  const blockedReason = budgetExhausted
    ? 'بلغت الحد الأقصى للكتب المستعارة — أعِد كتابة إحداها أولاً.'
    : mustVerify
      ? 'حسابك بانتظار التوثيق. يمكنك التصفح وقائمة الانتظار، لكن تسليم الكتاب يتطلب حساباً موثّقاً.'
      : null

  return (
    <>
      <Card className="p-2 ring-0 border border-border">
        <div className="flex flex-col gap-4">
          <div className="relative w-full aspect-[2/3] max-w-[280px] mx-auto overflow-hidden rounded-xl">
            {isAvailable && (
              <div className="absolute top-3 end-3 z-10 flex h-fit w-fit items-center justify-center gap-[5.36px] rounded-lg border border-solid border-fill-white/10 bg-success-50 px-[15px] py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.40),inset_1px_0_0_rgba(255,255,255,0.32),inset_0_-1px_4px_rgba(0,0,0,0.13),inset_-1px_0_4px_rgba(0,0,0,0.11)] backdrop-blur-[6px]">
                <span className="relative flex w-fit items-center justify-center text-center font-alyamama text-sm font-normal leading-[normal] text-fill-white">
                  متوفر
                </span>
              </div>
            )}
            <Image
              src={imageUrl}
              alt={media?.alt || 'Book'}
              fill
              className="object-cover rounded-xl"
              sizes="(max-width: 1024px) 100vw, 300px"
            />
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="text-center text-base font-bold leading-tight text-foreground sm:text-xl lg:text-2xl xl:text-3xl">
              {bookTitle || 'بدون عنوان'}
            </h2>

            <div className="flex items-center justify-center">
              <Ratings averageRating={averageRating || 0} ratingCount={ratingCount || 0} />
            </div>
            {adminMode ? (
              <div className="flex flex-col gap-3">{adminActions}</div>
            ) : (
              <>
                {remainingSlots !== null && (
                  <p className="text-center text-xs text-muted-foreground">
                    المتبقي من حد الإعارة:{' '}
                    <span className="font-medium text-card-foreground">{remainingSlots}</span>
                  </p>
                )}

                {hasActiveLoan ? (
                  <div className="flex items-center justify-center gap-2 rounded-lg border border-[#0DE9C3]/30 bg-[#0DE9C3]/10 px-4 py-3">
                    <CheckCircle2 className="size-5 text-[#0DE9C3]" />
                    <span className="font-alyamama text-sm font-medium text-[#0AAFC2] dark:text-[#4dedff]">
                      لديك إعارة نشطة لهذا الكتاب
                    </span>
                  </div>
                ) : waitlisted ? (
                  <div className="flex items-center justify-center gap-2 rounded-lg border border-[#FFB020]/30 bg-[#FFB020]/10 px-4 py-3">
                    <ListOrdered className="size-5 text-[#FFB020]" />
                    <span className="font-alyamama text-sm font-medium text-[#B45309] dark:text-[#ffcaa2]">
                      أنت في قائمة الانتظار — المركز {waitlistPosition}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Button
                      className="w-full text-lg text-secondary h-12 bg-primary hover:bg-primary/90 shadow-[inset_0px_4px_8px_1px_#ffffff99] hover:shadow-[inset_0px_4px_8px_1px_#ffffff66,0_0_12px_rgba(13,233,195,0.7)] active:brightness-90 active:shadow-none"
                      onClick={handleBorrowClick}
                      disabled={isBorrowing || Boolean(blockedReason)}
                    >
                      {!user
                        ? 'تصفح الكتاب'
                        : isAvailable
                          ? 'احجز الآن'
                          : 'انضم إلى قائمة الانتظار'}
                    </Button>
                    {blockedReason && (
                      <p className="text-center text-xs leading-relaxed text-muted-foreground">
                        {blockedReason}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex gap-3">
                  <BookFavoriteButton
                    bookId={bookId}
                    initialFavorited={initialFavorited}
                    className="flex-1 h-12"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="نسخ رابط الكتاب"
                    onClick={onCopyLink}
                    className="h-12 w-12"
                  >
                    <Link className="size-5" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>

      {!adminMode && (
        <BorrowDialog
          open={borrowDialogOpen}
          onOpenChange={setBorrowDialogOpen}
          onConfirm={handleBorrowConfirm}
          isLoading={isBorrowing}
          bookTitle={bookTitle}
        />
      )}
    </>
  )
}

export default BookPreview
