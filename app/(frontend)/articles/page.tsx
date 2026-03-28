'use client'
import React from 'react'
import Layout from '@/components/layouts'
import { Pagination } from '@/components/common/Pagination'
import ListingContent from '@/components/listing/ListingContent'
import ListingToolbar from '@/components/listing/listing-toolbar/ListingToolbar'
import ListingRenderer from '@/components/listing/ListingRenderer'
import ArticleCard from './_components/ArticleCard'
import { useSearch } from '@/hooks/use-search'
import { ArticleSearchParams, ArticleType } from '@/interfaces/articles.interfaces'
import EmptyData from '@/components/common/EmptyData'
import ErrorData from '@/components/common/ErrorData'
import { useGetArticlesQuery } from '@/lib/apis/articles/queries'
import { availabilityConfigArray, languagesConfigArray } from '@/utils/constants/data'
import { articleTypesConfigArray } from '@/utils/constants/articles'

const ArticlesPage: React.FC = () => {
  const { searchValues, values, setValue } = useSearch<ArticleSearchParams>({
    initialValues: {
      page: 1,
      limit: 12,
      search: '',
      availability: undefined,
      languages: [],
      types: [],
    },
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
            <p className="text-secondary text-5xl text-center font-khalid">مقالات المسجد</p>
            <p className="text-foreground text-xl text-center">
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
            }}
            filtersProps={{
              enabled: true,
              values: values.types || [],
              options: articleTypesConfigArray,
              onChange: (values) => {
                setValue('types', values as ArticleType[])
              },
            }}
            languageProps={{
              enabled: true,
              values: values.languages || [],
              options: languagesConfigArray,
              onChange: (values) => {
                setValue('languages', values as string[])
              },
            }}
            availabilityProps={{
              enabled: true,
              value: values.availability || 'all',
              options: availabilityConfigArray,
              buttonClassName: 'flex-1',
              onChange: (value) =>
                setValue('availability', value as 'available' | 'not-available' | 'all'),
            }}
          />

          <ListingRenderer
            isEmpty={totalDocs === 0}
            isError={isError}
            isLoading={isLoading}
            emptyFallback={<EmptyData title="لم يتم العثور على أي كتب" />}
            errorFallback={<ErrorData />}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
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
