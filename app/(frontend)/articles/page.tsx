'use client'
import React from 'react'
import Layout from '@/components/layouts'
import { Pagination } from '@/components/common/Pagination'
import ListingContent from '@/components/listing/ListingContent'
import ListingToolbar from '@/components/listing/listing-toolbar/ListingToolbar'
import ListingRenderer from '@/components/listing/ListingRenderer'
import BlogArticleCard from '@/components/ui/landing/BlogArticleCard'
import { useSearch } from '@/hooks/use-search'
import { ArticleSearchParams, ArticleType } from '@/interfaces/articles.interfaces'
import EmptyData from '@/components/common/EmptyData'
import ErrorData from '@/components/common/ErrorData'
import { useGetArticlesQuery } from '@/lib/apis/articles'
import { articleTypesConfigArray } from '@/utils/constants/articles'
import ArticleCardSkeleton from '@/components/ui/landing/ArticleCardSkeleton'
import { Tag } from 'lucide-react'

const ArticlesPage: React.FC = () => {
  const { searchValues, values, setValue } = useSearch<ArticleSearchParams>({
    initialValues: {
      page: 1,
      limit: 12,
      search: '',
      types: [],
    },
    scope: 'articles',
  })

  const {
    data: { docs: articles = [], totalPages = 1, totalDocs = 0 } = {},
    isLoading,
    isError,
  } = useGetArticlesQuery(searchValues)
  return (
    <Layout>
      <div className="flex flex-col space-y-14">
        <div className="flex flex-col items-center justify-center gap-12">
          <div className="space-y-4">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-secondary-500 mb-4 md:mb-6 text-center font-khalid">مقالات المسجد</h1>
            <p className="text-lg md:text-xl text-center max-w-2xl text-muted-foreground">
              مجموعة من المقالات التي تضيء الفكر وتقرّب القلب إلى الله، تجمع بين الحكمة، والمعرفة،
              وجمال الكلمة الهادفة.
            </p>
          </div>
        </div>
        <ListingContent>
          <ListingToolbar
            onApplyFilters={() => setValue('page', 1)}
            searchProps={{
              enabled: true,
              value: searchValues.search || '',
              onChange: (value) => setValue('search', value),
              placeholder: 'عنوان المقال، الكاتب ...',
            }}
            filterSections={[
              {
                id: 'types',
                title: 'التصنيفات',
                icon: <Tag />,
                multiple: true,
                options: articleTypesConfigArray,
                value: values.types || [],
                onChange: (v) => setValue('types', v as ArticleType[]),
                resetValue: [],
              },
            ]}
          />

          <ListingRenderer
            isEmpty={totalDocs === 0}
            isError={isError}
            isLoading={isLoading}
            emptyFallback={<EmptyData title="لم يتم العثور على أي مقالات" />}
            errorFallback={<ErrorData />}
            loader={
              <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 12 }).map((_, index) => (
                  <ArticleCardSkeleton key={index} />
                ))}
              </div>
            }
          >
            <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((article) => (
                <BlogArticleCard key={article.id} article={article} />
              ))}
            </div>
            <Pagination
              totalPages={totalPages}
              onPageChange={(value) => setValue('page', value)}
              page={values.page || 1}
              dir="rtl"
              nextButtonLabel="التالي"
              previousButtonLabel="السابق"
            />
          </ListingRenderer>
        </ListingContent>
      </div>
    </Layout>
  )
}

export default ArticlesPage
