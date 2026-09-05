'use client'

import React from 'react'
import { Tag } from 'lucide-react'
import UserPage from '@/app/member-portal/UserPage'
import { Pagination } from '@/shared/common/Pagination'
import ListingRenderer from '@/shared/listing/ListingRenderer'
import ListingToolbar from '@/shared/listing/listing-toolbar/ListingToolbar'
import BlogArticleCard from '@/features/articles/components/BlogArticleCard'
import ArticleCardSkeleton from '@/features/articles/components/ArticleCardSkeleton'
import EmptyData from '@/shared/common/EmptyData'
import ErrorData from '@/shared/common/ErrorData'
import { useGetArticlesQuery } from '@/features/articles/api/articles.queries'
import { useSearch } from '@/shared/hooks/use-search'
import { ArticleSearchParams, ArticleType } from '@/features/articles/types'
import { articleTypesConfigArray } from '@/utils/constants/articles'

const MemberArticlesPage: React.FC = () => {
  const { searchValues, values, setValue } = useSearch<ArticleSearchParams>({
    initialValues: {
      page: 1,
      limit: 12,
      search: '',
      types: [],
    },
    scope: 'member-articles',
  })

  const {
    data: { docs: articles = [], totalPages = 1, totalDocs = 0 } = {},
    isLoading,
    isError,
  } = useGetArticlesQuery(searchValues)

  return (
    <UserPage title="المقالات">
      <div className="mt-6">
        <ListingToolbar
          onApplyFilters={() => setValue('page', 1)}
          quickFilterSections={[
            {
              id: 'types-quick',
              multiple: false,
              options: [
                { value: '', label: 'الكل' },
                ...articleTypesConfigArray,
              ],
              value: (values.types || [])[0] || '',
              onChange: (v) => setValue('types', v ? [v as ArticleType] : []),
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
          filterButtonClassName="bg-card"
        />
      </div>

      <div className="mt-6">
        <ListingRenderer
          isEmpty={totalDocs === 0}
          isError={isError}
          isLoading={isLoading}
          emptyFallback={<EmptyData title="لم يتم العثور على أي مقالات" />}
          errorFallback={<ErrorData />}
          loader={
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <ArticleCardSkeleton key={index} />
              ))}
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {articles.map((article) => (
              <BlogArticleCard
                key={article.id}
                article={article}
                href={`/user/articles/${article.id}`}
              />
            ))}
          </div>
          <div className="mt-6">
            <Pagination
              totalPages={totalPages}
              onPageChange={(page) => setValue('page', page)}
              page={values.page || 1}
              dir="rtl"
              nextButtonLabel="التالي"
              previousButtonLabel="السابق"
            />
          </div>
        </ListingRenderer>
      </div>
    </UserPage>
  )
}

export default MemberArticlesPage