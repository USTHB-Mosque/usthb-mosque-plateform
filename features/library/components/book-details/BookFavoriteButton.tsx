'use client'

import React, { useState, useTransition } from 'react'
import { BookmarkCheck, BookmarkPlus } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { toggleBookFavorite } from '@/features/library/server/favorites'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { cn } from '@/shared/lib/utils'

type BookFavoriteButtonProps = {
  bookId: number
  initialFavorited: boolean
  className?: string
}

const BookFavoriteButton: React.FC<BookFavoriteButtonProps> = ({ bookId, initialFavorited, className }) => {
  const [favorited, setFavorited] = useState(initialFavorited)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  return (
    <Button
      type="button"
      variant="outline"
      className={cn(
        'rounded-xl transition-all flex-1 h-12 border-primary/40',
        favorited
          ? 'bg-primary/10 text-primary border-primary/40 hover:bg-primary/15'
          : 'border-border',
        className,
      )}
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const r = await toggleBookFavorite(bookId)
          if (!r.ok) {
            toast.error('error' in r ? r.error : 'تعذر التحديث')
            return
          }
          setFavorited(r.favorited)
          toast.success(r.favorited ? 'أُضيف إلى المفضلة' : 'أُزيل من المفضلة')
          router.refresh()
        })
      }}
      aria-label={favorited ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
    >
      <span className="font-bold">{favorited ? 'محفوظ' : 'حفظ'}</span>
      {favorited ? (
        <BookmarkCheck className="size-5" />
      ) : (
        <BookmarkPlus className="size-5" />
      )}
    </Button>
  )
}

export default BookFavoriteButton
