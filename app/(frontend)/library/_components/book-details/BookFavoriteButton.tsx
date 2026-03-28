'use client'

import React, { useState, useTransition } from 'react'
import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toggleBookFavorite } from '@/actions/profile'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

type BookFavoriteButtonProps = {
  bookId: number
  initialFavorited: boolean
}

const BookFavoriteButton: React.FC<BookFavoriteButtonProps> = ({ bookId, initialFavorited }) => {
  const [favorited, setFavorited] = useState(initialFavorited)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn(
        'shrink-0 rounded-xl border-2 transition-colors',
        favorited && 'border-primary/50 bg-primary/5 text-primary',
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
      <Heart className={cn('size-5', favorited && 'fill-primary text-primary')} />
    </Button>
  )
}

export default BookFavoriteButton
