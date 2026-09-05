import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { format } from 'date-fns'
import { arDZ } from 'date-fns/locale'
import type { Article, Media } from '@/payload-types'
import { getImageUrl } from '@/shared/lib/image-utils'
import { articleTypesConfigArray } from '@/utils/constants/articles'

interface ArticlesPreviewProps {
  articles: Article[]
}

const ArticlesPreview: React.FC<ArticlesPreviewProps> = ({ articles }) => {
  return (
    <section className="rounded-2xl border border-border bg-card">
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-card-foreground">آخر المقالات</h2>
        <Link href="/user/articles" className="text-xs text-primary-300 hover:underline">
          عرض الكل
        </Link>
      </header>

      {articles.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">لا توجد مقالات بعد.</p>
      ) : (
        <ul className="divide-y divide-border">
          {articles.map((article) => {
            const cover = article.image as Media | undefined
            const published = article.publishDate || article.createdAt
            const typeLabel =
              articleTypesConfigArray.find((config) => config.value === article.type)?.label ?? 'مقال'

            return (
              <li key={article.id}>
                <Link
                  href={`/user/articles/${article.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  <Image
                    src={getImageUrl(cover?.url, '/static/images/quran.png')}
                    alt={article.title}
                    width={40}
                    height={40}
                    className="size-10 shrink-0 rounded-md border border-border object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-card-foreground">
                      {article.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {format(new Date(published), 'd MMM yyyy', { locale: arDZ })}
                    </p>
                  </div>
                  <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-background-2 px-2.5 text-xs font-medium text-card-foreground">
                    {typeLabel}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default ArticlesPreview