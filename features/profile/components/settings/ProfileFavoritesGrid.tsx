'use client'

import React, { useTransition } from 'react'
import { Card, CardContent } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import type { BookFavorite } from '@/payload-types'
import { BookCard } from '@/features/library'
import { removeBookFavorite } from '@/features/library'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import EmptyData from '@/shared/common/EmptyData'
import { Trash2 } from 'lucide-react'

type ProfileFavoritesGridProps = {
  favorites: BookFavorite[]
}

const ProfileFavoritesGrid: React.FC<ProfileFavoritesGridProps> = ({ favorites }) => {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  if (favorites.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <EmptyData title="لا توجد كتب في المفضلة بعد" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {favorites.map((fav) => {
        const book = fav.book as any
        if (!book?.id) return null

        return (
          <div
            key={fav.id}
            className="relative group w-full max-w-sm justify-self-center sm:w-auto sm:justify-self-auto"
          >
            <BookCard book={book} href={`/user/library/book/${book.id}`} />
            <Button
              size="icon"
              variant="destructive"
              disabled={pending}
              className="absolute top-3 start-3 z-10 size-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                startTransition(async () => {
                  const r = await removeBookFavorite(fav.id)
                  if (r.ok) {
                    toast.success('تمت الإزالة من المفضلة')
                    router.refresh()
                  } else {
                    toast.error(r.error)
                  }
                })
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        )
      })}
    </div>
  )
}

export default ProfileFavoritesGrid
