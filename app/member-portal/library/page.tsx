'use client'

import React, { useState } from 'react'
import { Languages, PackageSearch, Tag, User } from 'lucide-react'
import UserPage from '@/app/member-portal/UserPage'
import { Pagination } from '@/components/common/Pagination'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ListingRenderer from '@/components/listing/ListingRenderer'
import ListingToolbar from '@/components/listing/listing-toolbar/ListingToolbar'
import { useGetBooksQuery } from '@/lib/apis/books'
import { useSearch } from '@/hooks/use-search'
import { BookSearchParams, BookCategory, BookType } from '@/interfaces/books.interfaces'
import { languagesConfigArray } from '@/utils/constants/data'
import {
  bookQuickTypesConfigArray,
  bookAuthorsConfigArray,
  bookTypesConfigArray,
} from '@/utils/constants/books'
import BookCard from '@/components/ui/landing/BookCard'
import BookCardSkeleton from '@/components/ui/landing/BookCardSkeleton'
import EmptyData from '@/components/common/EmptyData'
import ErrorData from '@/components/common/ErrorData'
import BooksTable from './_components/BooksTable'
import BooksTableSkeleton from './_components/BooksTableSkeleton'
import ViewSwitch, { CatalogView } from './_components/ViewSwitch'

const LibraryMemberPage: React.FC = () => {
  const [view, setView] = useState<CatalogView>('grid')

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
    scope: 'member-library',
  })

  const activeTab = values.category

  const {
    data: { docs: books = [], totalPages = 1, totalDocs = 0 } = {},
    isLoading,
    isError,
  } = useGetBooksQuery(searchValues)

  return (
    <UserPage title="فهرس الكتب">
      <div className="flex justify-center">
        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            const val = v as BookCategory
            setValue('types', [])
            setValue('category', val)
          }}
        >
          <TabsList>
            <TabsTrigger value={BookCategory.Religious}>الكتب الدينية</TabsTrigger>
            <TabsTrigger value={BookCategory.Scientific}>الكتب العلمية</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="mt-6">
        <ListingToolbar
          onApplyFilters={() => setValue('page', 1)}
          quickFilterSections={[
            {
              id: 'types-quick',
              multiple: true,
              options: bookQuickTypesConfigArray[activeTab],
              value: values.types || [],
              onChange: (v) => setValue('types', v as BookType[]),
            },
          ]}
          searchProps={{
            enabled: true,
            value: searchValues.search || '',
            onChange: (value) => {
              setValue('search', value)
              setValue('page', 1)
            },
            placeholder: 'اسم الكتاب، المؤلف ...',
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
              id: 'authors',
              title: 'المؤلفون',
              icon: <User />,
              multiple: true,
              options: bookAuthorsConfigArray,
              value: values.authors || [],
              onChange: (v) => setValue('authors', v as string[]),
              buttonClassName: 'flex-1',
              resetValue: [],
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
            {
              id: 'availability',
              title: 'التوفر',
              icon: <PackageSearch />,
              multiple: false,
              options: [
                { value: '', label: 'الكل' },
                { value: 'available', label: 'متوفر' },
                { value: 'not-available', label: 'غير متوفر' },
              ],
              value: values.availability || '',
              onChange: (v) =>
                setValue(
                  'availability',
                  v === 'available' || v === 'not-available' ? v : undefined,
                ),
              resetValue: '',
            },
          ]}
          actions={<ViewSwitch view={view} onViewChange={setView} />}
          filterButtonClassName="bg-card"
        />
      </div>

      <div className="mt-6">
        <ListingRenderer
          isEmpty={totalDocs === 0}
          isError={isError}
          isLoading={isLoading}
          emptyFallback={<EmptyData title="لم يتم العثور على أي كتب" />}
          errorFallback={<ErrorData />}
          loader={
            view === 'grid' ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 12 }).map((_, index) => (
                  <BookCardSkeleton key={index} />
                ))}
              </div>
            ) : (
              <BooksTableSkeleton />
            )
          }
        >
          {view === 'grid' ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {books.map((book) => (
                <BookCard key={book.id} book={book} href={`/user/library/book/${book.id}`} />
              ))}
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <BooksTable books={books} />
            </div>
          )}
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

export default LibraryMemberPage