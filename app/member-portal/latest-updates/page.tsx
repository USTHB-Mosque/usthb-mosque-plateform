import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { format } from 'date-fns'
import { arDZ } from 'date-fns/locale'
import UserPage from '@/app/member-portal/UserPage'
import { Card } from '@/components/ui/card'
import { getLatestUpdates } from '@/actions/profile/latest-updates'
import { getImageUrl } from '@/utils/image-utils'
import { activitiesTypesConfig } from '@/utils/constants/activities'
import { articleTypesConfigArray } from '@/utils/constants/articles'
import type { Article, Activity, Media } from '@/payload-types'

const formatDate = (value: string | undefined) =>
  value ? format(new Date(value), 'd MMM yyyy', { locale: arDZ }) : 'غير محدد'

const ArticleRow: React.FC<{ article: Article }> = ({ article }) => {
  const cover = article.image as Media | undefined
  const published = article.publishDate || article.createdAt
  const typeLabel =
    articleTypesConfigArray.find((config) => config.value === article.type)?.label ?? 'مقال'

  return (
    <li>
      <Link
        href={`/user/articles/${article.id}`}
        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
      >
        <Image
          src={getImageUrl(cover?.url, '/static/images/quran.png')}
          alt={article.title}
          width={48}
          height={48}
          className="size-12 shrink-0 rounded-md border border-border object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-card-foreground">{article.title}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {article.author} • {formatDate(published)}
          </p>
        </div>
        <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-background-2 px-2.5 text-xs font-medium text-card-foreground">
          {typeLabel}
        </span>
      </Link>
    </li>
  )
}

const ActivityRow: React.FC<{ activity: Activity }> = ({ activity }) => {
  const cover = activity.image as Media | undefined
  const typeLabel = activitiesTypesConfig[activity.type] ?? 'نشاط'

  return (
    <li>
      <Link
        href={`/user/activities/${activity.id}`}
        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
      >
        <Image
          src={getImageUrl(cover?.url, '/static/images/quran.png')}
          alt={activity.title}
          width={48}
          height={48}
          className="size-12 shrink-0 rounded-md border border-border object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-card-foreground">{activity.title}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {activity.location || 'في مسجد الجامعة'} • {formatDate(activity.startDate)}
          </p>
        </div>
        <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-background-2 px-2.5 text-xs font-medium text-card-foreground">
          {typeLabel}
        </span>
      </Link>
    </li>
  )
}

const LatestUpdatesPage: React.FC = async () => {
  const data = await getLatestUpdates()

  return (
    <UserPage title="آخر التحديثات" description="آخر أخبار ومستجدات المسجد">
      {data ? (
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card">
            <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-card-foreground">أحدث المقالات</h2>
              <Link href="/user/articles" className="text-xs text-primary-300 hover:underline">
                عرض الكل
              </Link>
            </header>
            {data.articles.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                لا توجد مقالات بعد.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {data.articles.map((article) => (
                  <ArticleRow key={article.id} article={article} />
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card">
            <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-card-foreground">أنشطة جديدة</h2>
              <Link href="/user/activities" className="text-xs text-primary-300 hover:underline">
                عرض الكل
              </Link>
            </header>
            {data.activities.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                لا توجد أنشطة جديدة بعد.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {data.activities.map((activity) => (
                  <ActivityRow key={activity.id} activity={activity} />
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : (
        <Card className="p-10 text-center text-muted-foreground">
          تعذّر تحميل آخر التحديثات.
        </Card>
      )}
    </UserPage>
  )
}

export default LatestUpdatesPage