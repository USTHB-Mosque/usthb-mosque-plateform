'use client'
import React, { useState } from 'react'
import Layout from '@/components/layouts'
import BookCard from './_components/BookCard'
import { Pagination } from '@/components/common/Pagination'
import { ButtonGroup } from '@/components/ui/button-group'
import ListingContent from '@/components/listing/ListingContent'
import ListingToolbar from '@/components/listing/listing-toolbar/ListingToolbar'
import ListingRenderer from '@/components/listing/ListingRenderer'
import { useGetBooksQuery } from '@/lib/apis/books/queries'
import { useSearch } from '@/hooks/use-search'
import { BookSearchParams, BookCategory, BookType } from '@/interfaces/books.interfaces'

const LibraryPage: React.FC = () => {
  const { searchValues, setValues, setValue } = useSearch<BookSearchParams>({
    initialValues: {
      page: 1,
      limit: 12,
      search: '',
      // available: undefined,
      // language: undefined,
      // type: undefined,
      category: BookCategory.Religious,
    },
  })

  const {
    data: { docs: books = [], totalPages = 1, totalDocs = 0, hasNextPage, hasPrevPage } = {},
    isLoading,
  } = useGetBooksQuery(searchValues)

  if (isLoading || !books) return null
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

          <ButtonGroup
            value={searchValues.category}
            onSelect={(value) => setValue('category', value as BookCategory)}
            buttons={[
              {
                label: 'الكتب العلمية',
                value: BookCategory.Scientific,
              },
              {
                label: 'الكتب الدينية',
                value: BookCategory.Religious,
              },
            ]}
          />
        </div>
        <ListingContent>
          <ListingToolbar />

          <ListingRenderer
            isEmpty={false}
            isError={false}
            isLoading={false}
            emptyFallback={<div>ok</div>}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {books.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
            <Pagination
              totalPages={totalPages}
              onPageChange={(value) => setValue('page', value)}
              page={searchValues.page || 1}
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
