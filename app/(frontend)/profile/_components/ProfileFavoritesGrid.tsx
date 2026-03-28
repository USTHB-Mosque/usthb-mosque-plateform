'use client'

import React, { useTransition } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Book, BookFavorite, Media } from '@/payload-types'
import { removeBookFavorite } from '@/actions/profile'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import EmptyData from '@/components/common/EmptyData'
import { Heart } from 'lucide-react'

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
          <div className="flex justify-center mt-4">
            <Button asChild variant="outline">
              <Link href="/library">تصفح المكتبة</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {favorites.map((fav) => {
        const book = fav.book as Book
        const image = book?.image as Media | undefined
        if (!book?.id) return null

        return (
          <Card key={fav.id} className="overflow-hidden flex flex-col">
            <div className="relative aspect-[4/3] bg-muted">
              {image?.url ? (
                <Image
                  src={image.url}
                  alt={image.alt || book.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 50vw"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <Heart className="size-10 opacity-30" />
                </div>
              )}
            </div>
            <CardContent className="flex flex-1 flex-col gap-3 p-4">
              <div className="space-y-1">
                <p className="font-bold font-dubai text-lg leading-snug line-clamp-2">{book.title}</p>
                <p className="text-sm text-muted-foreground line-clamp-1">{book.author}</p>
              </div>
              <div className="flex flex-wrap gap-2 mt-auto">
                {book.availableBooks && book.availableBooks > 0 ? (
                  <Badge className="bg-primary/15 text-primary">متوفر</Badge>
                ) : (
                  <Badge variant="secondary">غير متوفر</Badge>
                )}
              </div>
              <div className="flex gap-2 pt-1">
                <Button asChild size="sm" className="flex-1">
                  <Link href={`/library/book/${book.id}`}>عرض الكتاب</Link>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => {
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
                  إزالة
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export default ProfileFavoritesGrid
