'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/shared/ui/card'
import Image from 'next/image'
import Ratings from '@/shared/common/Ratings'
import { Link, Loader2 } from 'lucide-react'
import { Book, Media } from '@/payload-types'
import { toast } from 'sonner'
import BookFavoriteButton from './BookFavoriteButton'
import BorrowDialog from './BorrowDialog'
import { getImageUrl } from '@/shared/lib/image-utils'
import { borrowBook } from '@/features/library/server/borrow-book'
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
}

const BookPreview: React.FC<BookPreviewProps> = ({
  image,
  averageRating,
  ratingCount,
  isAvailable,
  bookId,
  initialFavorited,
  bookTitle,
}) => {
  const media = image as Media
  const imageUrl = getImageUrl(media?.url)
  const router = useRouter()
  const [isBorrowing, setIsBorrowing] = useState(false)
  const [borrowDialogOpen, setBorrowDialogOpen] = useState(false)
  const { data: { user } = { user: undefined } } = useGetProfileQuery()

  const onCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    toast.success('تم نسخ الرابط')
  }

  const handleBorrowClick = () => {
    if (!user) {
      router.push('/auth/login?redirect=/library/book/' + bookId)
      return
    }
    if (!isAvailable) {
      toast.error('عذراً، الكتاب غير متوفر حالياً')
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
            <div className="flex items-center justify-center">
              <Ratings averageRating={averageRating || 0} ratingCount={ratingCount || 0} />
            </div>
            
            <Button 
              className="w-full text-lg text-secondary h-12 bg-primary hover:bg-primary/90 shadow-[inset_0px_4px_8px_1px_#ffffff99] hover:shadow-[inset_0px_4px_8px_1px_#ffffff66,0_0_12px_rgba(13,233,195,0.7)] active:brightness-90 active:shadow-none" 
              onClick={handleBorrowClick}
              disabled={isBorrowing}
            >
              {user ? 'احجز الآن' : 'تصفح الكتاب'}
            </Button>
            
            <div className="flex gap-3">
              <BookFavoriteButton bookId={bookId} initialFavorited={initialFavorited} className="flex-1 h-12" />
              <Button variant="outline" size="icon" onClick={onCopyLink} className="h-12 w-12">
                <Link className="size-5" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <BorrowDialog
        open={borrowDialogOpen}
        onOpenChange={setBorrowDialogOpen}
        onConfirm={handleBorrowConfirm}
        isLoading={isBorrowing}
        bookTitle={bookTitle}
      />
    </>
  )
}

export default BookPreview
