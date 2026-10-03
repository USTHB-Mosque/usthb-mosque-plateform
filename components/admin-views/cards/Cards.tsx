'use client'

import React, { useState } from 'react'
import { useSearch } from '@/shared/hooks/use-search'
import { Archive, BadgeCheck, CircleSlash, CreditCard, Plus } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import ListingRenderer from '@/shared/listing/ListingRenderer'
import ListingToolbar from '@/shared/listing/listing-toolbar/ListingToolbar'
import EmptyData from '@/shared/common/EmptyData'
import ErrorData from '@/shared/common/ErrorData'
import { Pagination } from '@/shared/common/Pagination'
import { Skeleton } from '@/shared/ui/skeleton'
import { LIBRARY_CARD_STATUSES, type LibraryCardStatus } from '@/utils/constants/library-cards'
import type { AdminCardsParams } from '@/features/admin/server/cards'
import { useGetAdminCardsQuery } from '@/features/admin/api/cards.queries'
import AddCardDialog from './AddCardDialog'
import CardsTable from './CardsTable'

interface CardsPageProps {
  stats: {
    total: number
    active: number
    inactive: number
    archived: number
  }
}

const statCards = [
  { label: 'عدد البطاقات', key: 'total' as const, icon: CreditCard },
  { label: 'عدد البطاقات الفعالة', key: 'active' as const, icon: BadgeCheck },
  { label: 'عدد البطاقات الغير فعالة', key: 'inactive' as const, icon: CircleSlash },
  { label: 'عدد البطاقات المأرشفة', key: 'archived' as const, icon: Archive },
]

const STATUS_OPTIONS = LIBRARY_CARD_STATUSES.map((status) => ({
  value: status.value,
  label: status.label,
}))

const CardsSkeleton = () => (
  <div className="flex flex-col gap-3 p-4">
    {Array.from({ length: 5 }).map((_, index) => (
      <Skeleton key={index} className="h-12 w-full" />
    ))}
  </div>
)

/**
 * The library card index (#145, Figma `cards` 1606:14136): the four counts, the
 * status filter and the card rows. Counts come from the server render so they
 * are right on first paint; the rows refetch through the query hook.
 */
const Cards: React.FC<CardsPageProps> = ({ stats }) => {
  const [addOpen, setAddOpen] = useState(false)

  const { values, searchValues, setValue } = useSearch<AdminCardsParams>({
    initialValues: { page: 1, limit: 20, search: '', status: [] },
    scope: 'admin-cards',
  })

  const {
    data: { docs = [], totalPages = 1 } = {},
    isLoading,
    isError,
  } = useGetAdminCardsQuery({
    ...values,
    search: searchValues.search || undefined,
  })

  return (
    <div className="flex flex-col gap-6">
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

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          تُصدر البطاقة تلقائياً عند توثيق العضو، وهذه الشاشة لإصلاح ما نقص أو لإدارة حالة البطاقة.
        </p>
        <Button
          size="lg"
          className="gap-2 border border-primary bg-primary shadow-[inset_0px_4px_8px_1px_#ffffff99] hover:brightness-110 hover:shadow-[inset_0px_4px_8px_1px_#ffffff66,0_0_12px_rgba(13,233,195,0.7)] active:brightness-90 active:shadow-none"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="size-4" />
          إضافة بطاقة
        </Button>
      </div>

      <div>
        <ListingToolbar
          onApplyFilters={() => setValue('page', 1)}
          quickFilterSections={[
            {
              id: 'card-status',
              multiple: true,
              options: STATUS_OPTIONS,
              value: values.status ?? [],
              onChange: (next) => {
                setValue('status', next as LibraryCardStatus[])
                setValue('page', 1)
              },
            },
          ]}
          searchProps={{
            enabled: true,
            value: searchValues.search || '',
            onChange: (value) => {
              setValue('search', value)
              setValue('page', 1)
            },
            placeholder: 'معرف البطاقة، الاسم، البريد الإلكتروني ...',
          }}
          filterButtonClassName="bg-card"
        />
      </div>

      <ListingRenderer
        isEmpty={docs.length === 0}
        isError={isError}
        isLoading={isLoading}
        emptyFallback={<EmptyData title="لا توجد بطاقات مطابقة" />}
        errorFallback={<ErrorData />}
        loader={<CardsSkeleton />}
      >
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <CardsTable cards={docs} />
        </div>
        {totalPages > 1 ? (
          <div className="mt-6 flex justify-center">
            <Pagination
              page={values.page || 1}
              totalPages={totalPages}
              onPageChange={(next) => setValue('page', next)}
              dir="rtl"
            />
          </div>
        ) : null}
      </ListingRenderer>

      <AddCardDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  )
}

export default Cards
