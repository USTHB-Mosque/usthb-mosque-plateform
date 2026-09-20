'use client'

import React, { useTransition } from 'react'
import { Card, CardContent } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import type { ArticleFavorite } from '@/payload-types'
import BlogArticleCard from '@/features/articles/components/BlogArticleCard'
import { removeArticleFavorite } from '@/features/library'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import EmptyData from '@/shared/common/EmptyData'
import { Trash2 } from 'lucide-react'

type ProfileArticleFavoritesGridProps = {
  favorites: ArticleFavorite[]
}

const ProfileArticleFavoritesGrid: React.FC<ProfileArticleFavoritesGridProps> = ({ favorites }) => {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  if (favorites.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <EmptyData title="لا توجد مقالات في المفضلة بعد" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {favorites.map((fav) => {
        const article = fav.article as any
        if (!article?.id) return null

        return (
          <div key={fav.id} className="relative group max-w-sm">
            <BlogArticleCard article={article} href={`/articles/${article.id}`} />
            <Button
              size="icon"
              variant="destructive"
              disabled={pending}
              className="absolute top-3 start-3 z-10 size-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                startTransition(async () => {
                  const r = await removeArticleFavorite(fav.id)
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

export default ProfileArticleFavoritesGrid
