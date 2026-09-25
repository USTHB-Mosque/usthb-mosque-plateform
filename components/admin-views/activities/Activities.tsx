'use client'

import React, { useEffect, useState } from 'react'
import { CalendarCheck, CalendarClock, CalendarX2, Plus, TicketCheck } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import ListingRenderer from '@/shared/listing/ListingRenderer'
import ListingToolbar from '@/shared/listing/listing-toolbar/ListingToolbar'
import { useGetActivitiesQuery } from '@/features/activities/api/activities.queries'
import { useSearch } from '@/shared/hooks/use-search'
import AddActivityDialog from './AddActivityDialog'
import { ActivitySearchParams } from '@/features/activities/types'
import { activitiesTypesConfigArray } from '@/utils/constants/activities'
import ActivityCard from '@/features/activities/components/ActivityCard'
import ActivityCardSkeleton from '@/features/activities/components/ActivityCardSkeleton'
import EmptyData from '@/shared/common/EmptyData'
import ErrorData from '@/shared/common/ErrorData'
import ActivitiesTable from './ActivitiesTable'
import ViewSwitch, { CatalogView } from '@/features/library/components/ViewSwitch'
import StatCards from '@/components/admin-views/shared/StatCards'
import { Pagination } from '@/shared/common/Pagination'
import type { Activity } from '@/payload-types'

interface ActivitiesProps {
  stats: {
    totalActivities: number
    upcomingActivities: number
    completedActivities: number
    openForRegistrationActivities: number
  }
}

const VIEW_KEY = 'admin-activities-view'

const Activities: React.FC<ActivitiesProps> = ({ stats }) => {
  const [view, setView] = useState<CatalogView>(() => {
    if (typeof window === 'undefined') return 'table'
    return localStorage.getItem(VIEW_KEY) === 'table' ? 'table' : 'grid'
  })
  const [addOpen, setAddOpen] = useState(false)
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null)

  useEffect(() => {
    localStorage.setItem(VIEW_KEY, view)
  }, [view])

  const { searchValues, values, setValue } = useSearch<ActivitySearchParams>({
    initialValues: {
      page: 1,
      limit: 10,
      search: '',
      types: [],
    },
    scope: 'admin-activities',
  })

  const {
    data: { docs: activities = [], totalPages = 1, totalDocs = 0 } = {},
    isLoading,
    isError,
  } = useGetActivitiesQuery(searchValues)

  const rowSkeleton = (count = 6) => (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex flex-col divide-y divide-border">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 p-4">
            <div className="h-4 w-40 animate-pulse rounded bg-muted" />
            <div className="h-6 w-16 animate-pulse rounded-full bg-muted" />
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
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
          { label: 'عدد الأنشطة', value: stats.totalActivities, icon: CalendarCheck },
          { label: 'أنشطة قادمة', value: stats.upcomingActivities, icon: CalendarClock },
          { label: 'أنشطة مكتملة', value: stats.completedActivities, icon: CalendarX2 },
          {
            label: 'مفتوحة للتسجيل',
            value: stats.openForRegistrationActivities,
            icon: TicketCheck,
          },
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
            إضافة نشاط
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
              options: activitiesTypesConfigArray,
              value: values.types || [],
              onChange: (v) => setValue('types', v as ActivitySearchParams['types']),
            },
          ]}
          searchProps={{
            enabled: true,
            value: searchValues.search || '',
            onChange: (value) => {
              setValue('search', value)
              setValue('page', 1)
            },
            placeholder: 'عنوان النشاط، المشرف ...',
          }}
          actions={<ViewSwitch view={view} onViewChange={setView} />}
          filterButtonClassName="bg-card"
        />
      </div>

      <ListingRenderer
        isEmpty={totalDocs === 0}
        isError={isError}
        isLoading={isLoading}
        emptyFallback={<EmptyData title="لم يتم العثور على أي أنشطة" />}
        errorFallback={<ErrorData />}
        loader={
          view === 'grid' ? (
            <div className="grid grid-cols-1 gap-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <ActivityCardSkeleton key={index} />
              ))}
            </div>
          ) : (
            rowSkeleton()
          )
        }
      >
        {view === 'grid' ? (
          <div className="grid grid-cols-1 gap-6">
            {activities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                href={`/admin-panel/activities/${activity.id}`}
              />
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <ActivitiesTable
              activities={activities}
              detailHref={(id) => `/admin-panel/activities/${id}`}
              onEdit={(activity) => {
                setEditingActivity(activity)
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

      <AddActivityDialog
        key={editingActivity ? `edit-${editingActivity.id}` : 'add'}
        activity={editingActivity}
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open)
          if (!open) setEditingActivity(null)
        }}
      />
    </div>
  )
}

export default Activities
