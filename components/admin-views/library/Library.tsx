'use client'

import React, { useState } from 'react'
import {
  Upload,
  Plus,
  Languages,
  PackageSearch,
  Tag,
  User,
  BookOpen,
  BookMarked,
  Package,
  AlertTriangle,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { Button } from '@/shared/ui/button'
import ListingRenderer from '@/shared/listing/ListingRenderer'
import ListingToolbar from '@/shared/listing/listing-toolbar/ListingToolbar'
import { useGetBooksQuery } from '@/features/library/api/books.queries'
import { useSearch } from '@/shared/hooks/use-search'
import AddBookDialog from './AddBookDialog'
import ImportBooksDialog from './ImportBooksDialog'
import { BookSearchParams, BookCategory, BookType } from '@/features/library/types'
import { languagesConfigArray } from '@/utils/constants/data'
import {
  bookQuickTypesConfigArray,
  bookAuthorsConfigArray,
  bookTypesConfigArray,
} from '@/utils/constants/books'
import BookCard from '@/features/library/components/BookCard'
import BookCardSkeleton from '@/features/library/components/BookCardSkeleton'
import EmptyData from '@/shared/common/EmptyData'
import ErrorData from '@/shared/common/ErrorData'
import BooksTable from '@/features/library/components/BooksTable'
import BooksTableSkeleton from '@/features/library/components/BooksTableSkeleton'
import ViewSwitch, { CatalogView } from '@/features/library/components/ViewSwitch'
import type { Book } from '@/payload-types'

interface LibraryProps {
  stats: {
    totalBooks: number
    borrowedBooks: number
    availableBooks: number
    lostBooks: number
  }
}

const statCards = [
  { label: 'عدد الكتب', key: 'totalBooks' as const, icon: BookOpen },
  { label: 'عدد الكتب المستعارة', key: 'borrowedBooks' as const, icon: BookMarked },
  { label: 'عدد الكتب المتوفرة', key: 'availableBooks' as const, icon: Package },
  { label: 'عدد الكتب المفقودة', key: 'lostBooks' as const, icon: AlertTriangle },
]

const Library: React.FC<LibraryProps> = ({ stats }) => {
  const [view, setView] = useState<CatalogView>('table')
  const [addBookOpen, setAddBookOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editingBook, setEditingBook] = useState<Book | null>(null)

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
    scope: 'admin-library',
  })

  const activeTab = values.category

  const {
    data: { docs: books = [], totalPages = 1, totalDocs = 0 } = {},
    isLoading,
    isError,
  } = useGetBooksQuery(searchValues)

  return (
    <div className="flex flex-col gap-6">
      {/* Stat Cards — same style as member portal StatCard, non-clickable */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.label}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <div className="min-w-0">
                <div className="text-2xl font-bold text-card-foreground">{stats[stat.key]}</div>
                <div className="mt-0.5 truncate text-sm text-muted-foreground">{stat.label}</div>
              </div>
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-background-2 text-primary-300">
                <Icon className="size-5" aria-hidden />
              </div>
            </div>
          )
        })}
      </div>

      {/* Tabs + Actions — same line */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
        <div className="flex items-center gap-3">
          <Button variant="outline" size="lg" className="gap-2" onClick={() => setImportOpen(true)}>
            <Upload className="size-4" />
            استيراد ملف CSV
          </Button>
          <Button
            size="lg"
            className="gap-2 border border-primary bg-primary shadow-[inset_0px_4px_8px_1px_#ffffff99] hover:brightness-110 hover:shadow-[inset_0px_4px_8px_1px_#ffffff66,0_0_12px_rgba(13,233,195,0.7)] active:brightness-90 active:shadow-none"
            onClick={() => setAddBookOpen(true)}
          >
            <Plus className="size-4" />
            إضافة كتاب
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div>
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

      {/* Content */}
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
              <BookCard key={book.id} book={book} href={`/admin-panel/library/book/${book.id}`} />
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <BooksTable
              books={books}
              detailHref={(id) => `/admin-panel/library/book/${id}`}
              showBorrowAction={false}
              showBulkDelete
              onEdit={(book) => {
                setEditingBook(book)
                setAddBookOpen(true)
              }}
            />
          </div>
        )}
        <div className="mt-6">{/* Pagination placeholder */}</div>
      </ListingRenderer>

      <AddBookDialog
        key={editingBook ? `edit-${editingBook.id}` : 'add'}
        book={editingBook}
        open={addBookOpen}
        onOpenChange={(open) => {
          setAddBookOpen(open)
          if (!open) setEditingBook(null)
        }}
      />

      <ImportBooksDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  )
}

export default Library
