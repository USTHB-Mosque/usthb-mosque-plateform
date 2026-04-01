'use client'
import React from 'react'
import Layout from '@/components/layouts'
import BookCard from './_components/BookCard'
import { Pagination } from '@/components/common/Pagination'
import { ButtonGroup } from '@/components/ui/button-group'
import { Button } from '@/components/ui/button'
import ListingContent from '@/components/listing/ListingContent'
import ListingToolbar from '@/components/listing/listing-toolbar/ListingToolbar'
import ListingRenderer from '@/components/listing/ListingRenderer'
import { useGetBooksQuery } from '@/lib/apis/books/queries'
import { useSearch } from '@/hooks/use-search'
import { BookSearchParams, BookCategory, BookType } from '@/interfaces/books.interfaces'
import { languagesConfigArray, availabilityConfigArray } from '@/utils/constants/data'
import BookCardSkeleton from './_components/BookCardSkeleton'
import EmptyData from '@/components/common/EmptyData'
import ErrorData from '@/components/common/ErrorData'
import { bookTypesConfigArray } from '@/utils/constants/books'
import { BookOpenCheck, Languages, Tag } from 'lucide-react'

const LibraryPage: React.FC = () => {
  const { searchValues, values, setValue } = useSearch<BookSearchParams>({
    initialValues: {
      page: 1,
      limit: 12,
      search: '',
      availability: undefined,
      languages: [],
      types: [],
      category: BookCategory.Religious,
    },
  })
  const {
    data: { docs: books = [], totalPages = 1, totalDocs = 0 } = {},
    isLoading,
    isError,
  } = useGetBooksQuery(searchValues)

  return (
    <Layout>
      <div className="flex flex-col space-y-14">
        <div className="flex flex-col items-center justify-center gap-12">
          <div className="space-y-4">
            <p className="text-secondary text-5xl text-center font-khalid">مكتبة المسجد</p>
            <p className="text-foreground text-xl text-center">
              استكشف الكنوز المعرفية والكتب النادرة في مكتبة المسجد, متاحة للمطالعة والإستعارة.
            </p>
          </div>

          <ButtonGroup>
            {[
              {
                label: 'الكتب العلمية',
                value: BookCategory.Scientific,
              },
              {
                label: 'الكتب الدينية',
                value: BookCategory.Religious,
              },
            ].map((btn) => (
              <Button
                key={btn.value}
                variant={values.category === btn.value ? 'default' : 'outline'}
                onClick={() => setValue('category', btn.value)}
              >
                {btn.label}
              </Button>
            ))}
          </ButtonGroup>
        </div>
        <ListingContent>
          <ListingToolbar
            onApplyFilters={() => setValue('page', 1)}
            searchProps={{
              enabled: true,
              value: searchValues.search || '',
              onChange: (value) => setValue('search', value),
            }}
            filterSections={[
              {
                id: 'types',
                title: 'التصنيفات',
                icon: <Tag />,
                multiple: true,
                options: bookTypesConfigArray,
                value: values.types || [],
                onChange: (v) => setValue('types', v as BookType[]),
                resetValue: [],
              },
              {
                id: 'availability',
                title: 'التوفر',
                icon: <BookOpenCheck />,
                multiple: false,
                options: availabilityConfigArray,
                value: values.availability || 'all',
                onChange: (v) =>
                  setValue('availability', v as 'available' | 'not-available' | 'all'),
                buttonClassName: 'flex-1',
                resetValue: 'all',
              },
              {
                id: 'languages',
                title: 'اللغة',
                icon: <Languages />,
                multiple: true,
                options: languagesConfigArray,
                value: values.languages || [],
                onChange: (v) => setValue('languages', v as string[]),
                buttonClassName: 'flex-1',
                resetValue: [],
              },
            ]}
          />

          <ListingRenderer
            isEmpty={totalDocs === 0}
            isError={isError}
            isLoading={isLoading}
            emptyFallback={<EmptyData title="لم يتم العثور على أي كتب" />}
            errorFallback={<ErrorData />}
            loader={
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 12 }).map((_, index) => (
                  <BookCardSkeleton key={index} />
                ))}
              </div>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {books.map((book) => (
                <BookCard key={book.id} book={book} />
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

export default LibraryPage
