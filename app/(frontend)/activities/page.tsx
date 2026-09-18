'use client'
import React from 'react'
import Layout from '@/shared/layouts'
import { Pagination } from '@/shared/common/Pagination'
import ListingContent from '@/shared/listing/ListingContent'
import ListingToolbar from '@/shared/listing/listing-toolbar/ListingToolbar'
import ListingRenderer from '@/shared/listing/ListingRenderer'
import ActivityCard from '@/features/activities/components/ActivityCard'
import { useGetActivitiesQuery } from '@/features/activities/api/activities.queries'
import { ActivitySearchParams, ActivityType } from '@/features/activities/types'
import { useSearch } from '@/shared/hooks/use-search'
import { Tag } from 'lucide-react'
import { activitiesTypesConfigArray } from '@/utils/constants/activities'
import EmptyData from '@/shared/common/EmptyData'
import ErrorData from '@/shared/common/ErrorData'
import ActivitySkeleton from '@/features/activities/components/ActivitySkeleton'

const ActivitiesPage: React.FC = () => {
  const { searchValues, values, setValue } = useSearch<ActivitySearchParams>({
    initialValues: {
      page: 1,
      limit: 3,
      search: '',
      types: [],
    },
    scope: 'activities',
  })

  const {
    data: { docs: activities = [], totalPages = 1, totalDocs = 0 } = {},
    isLoading,
    isError,
  } = useGetActivitiesQuery(searchValues)
  return (
    <Layout>
      <div className="flex flex-col space-y-8 sm:space-y-12 lg:space-y-14">
        <div className="flex flex-col items-center justify-center gap-8 sm:gap-10 lg:gap-12 px-4">
          <div className="space-y-3 sm:space-y-4 text-center">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-secondary-500 mb-4 md:mb-6 text-center font-khalid">أنشطة المسجد</h1>
            <p className="text-lg md:text-xl text-center max-w-2xl text-muted-foreground">
              مجموعة من النشاطات الدعوية والتعليمية والاجتماعية التي تهدف إلى بناء مجتمع واعٍ، متآلف، يسير على هدي الإسلام.
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
              placeholder: 'اسم النشاط ...',
            }}
            filterSections={[
              {
                id: 'types',
                title: 'التصنيفات',
                icon: <Tag />,
                multiple: true,
                options: activitiesTypesConfigArray,
                value: values.types || [],
                onChange: (v) => setValue('types', v as ActivityType[]),
                resetValue: [],
              },
            ]}
          />
          <ListingRenderer
            isEmpty={totalDocs === 0}
            isError={isError}
            isLoading={isLoading}
            emptyFallback={<EmptyData title="لم يتم العثور على أي أنشطة" />}
            errorFallback={<ErrorData />}
            loader={
              <div className="flex flex-col space-y-12">
                {Array.from({ length: 3 }).map((_, index) => (
                  <ActivitySkeleton key={index} />
                ))}
              </div>
            }
          >
            <div className="flex flex-col space-y-12">
              {activities.map((activity) => (
                <ActivityCard key={activity.id} activity={activity} />
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

export default ActivitiesPage
