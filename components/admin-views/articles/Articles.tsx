'use client'

import React, { useEffect, useState } from 'react'
import { CalendarDays, Clock, FileText, Plus } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import ListingRenderer from '@/shared/listing/ListingRenderer'
import ListingToolbar from '@/shared/listing/listing-toolbar/ListingToolbar'
import { useGetArticlesQuery } from '@/features/articles/api/articles.queries'
import { useSearch } from '@/shared/hooks/use-search'
import AddArticleDialog from './AddArticleDialog'
import { ArticleSearchParams } from '@/features/articles/types'
import { articleTypesConfigArray } from '@/utils/constants/articles'
import BlogArticleCard from '@/features/articles/components/BlogArticleCard'
import ArticleCardSkeleton from '@/features/articles/components/ArticleCardSkeleton'
import EmptyData from '@/shared/common/EmptyData'
import ErrorData from '@/shared/common/ErrorData'
import ArticlesTable from './ArticlesTable'
import ViewSwitch, { CatalogView } from '@/features/library/components/ViewSwitch'
import StatCards from '@/components/admin-views/shared/StatCards'
import { Pagination } from '@/shared/common/Pagination'
import type { Article } from '@/payload-types'

interface ArticlesProps {
  stats: {
    totalArticles: number
    thisMonthArticles: number
    lastSevenDaysArticles: number
  }
}

const VIEW_KEY = 'admin-articles-view'

const Articles: React.FC<ArticlesProps> = ({ stats }) => {
  const [view, setView] = useState<CatalogView>(() => {
    if (typeof window === 'undefined') return 'table'
    return localStorage.getItem(VIEW_KEY) === 'table' ? 'table' : 'grid'
  })
  const [addOpen, setAddOpen] = useState(false)
  const [editingArticle, setEditingArticle] = useState<Article | null>(null)

  useEffect(() => {
    localStorage.setItem(VIEW_KEY, view)
  }, [view])

  const { searchValues, values, setValue } = useSearch<ArticleSearchParams>({
    initialValues: {
      page: 1,
      limit: 10,
      search: '',
      types: [],
    },
    scope: 'admin-articles',
  })

  const {
    data: { docs: articles = [], totalPages = 1, totalDocs = 0 } = {},
    isLoading,
    isError,
  } = useGetArticlesQuery(searchValues)

  const rowSkeleton = (count = 6) => (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex flex-col divide-y divide-border">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 p-4">
            <div className="h-4 w-40 animate-pulse rounded bg-muted" />
            <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
            <div className="h-6 w-16 animate-pulse rounded-full bg-muted" />
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      <StatCards
        items={[
          { label: 'عدد المقالات', value: stats.totalArticles, icon: FileText },
          { label: 'مقالات هذا الشهر', value: stats.thisMonthArticles, icon: CalendarDays },
          { label: 'مقالات آخر 7 أيام', value: stats.lastSevenDaysArticles, icon: Clock },
        ]}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div />
        <div className="flex items-center gap-3">
          <Button
            size="lg"
            className="gap-2 border border-primary bg-primary shadow-[inset_0px_4px_8px_1px_#ffffff99] hover:brightness-110 hover:shadow-[inset_0px_4px_8px_1px_#ffffff66,0_0_12px_rgba(13,233,195,0.7)] active:brightness-90 active:shadow-none"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="size-4" />
            إضافة مقال
          </Button>
        </div>
      </div>

      <div>
        <ListingToolbar
          onApplyFilters={() => setValue('page', 1)}
          quickFilterSections={[
            {
              id: 'types-quick',
              multiple: true,
              options: articleTypesConfigArray,
              value: values.types || [],
              onChange: (v) => setValue('types', v as ArticleSearchParams['types']),
            },
          ]}
          searchProps={{
            enabled: true,
            value: searchValues.search || '',
            onChange: (value) => {
              setValue('search', value)
              setValue('page', 1)
            },
            placeholder: 'عنوان المقال، الكاتب ...',
          }}
          actions={<ViewSwitch view={view} onViewChange={setView} />}
          filterButtonClassName="bg-card"
        />
      </div>

      <ListingRenderer
        isEmpty={totalDocs === 0}
        isError={isError}
        isLoading={isLoading}
        emptyFallback={<EmptyData title="لم يتم العثور على أي مقالات" />}
        errorFallback={<ErrorData />}
        loader={
          view === 'grid' ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <ArticleCardSkeleton key={index} />
              ))}
            </div>
          ) : (
            rowSkeleton()
          )
        }
      >
        {view === 'grid' ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <BlogArticleCard
                key={article.id}
                article={article}
                href={`/admin-panel/articles/${article.id}`}
              />
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <ArticlesTable
              articles={articles}
              detailHref={(id) => `/admin-panel/articles/${id}`}
              onEdit={(article) => {
                setEditingArticle(article)
                setAddOpen(true)
              }}
            />
          </div>
        )}
        <Pagination
          totalPages={totalPages}
          onPageChange={(value) => setValue('page', value)}
          page={values.page || 1}
          dir="rtl"
          nextButtonLabel="التالي"
          previousButtonLabel="السابق"
        />
      </ListingRenderer>

      <AddArticleDialog
        key={editingArticle ? `edit-${editingArticle.id}` : 'add'}
        article={editingArticle}
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open)
          if (!open) setEditingArticle(null)
        }}
      />
    </div>
  )
}

export default Articles
