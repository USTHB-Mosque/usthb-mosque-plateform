'use client'
import React from 'react'
import Layout from '@/components/layouts'
import { Pagination } from '@/components/common/Pagination'
import ListingContent from '@/components/listing/ListingContent'
import ListingToolbar from '@/components/listing/listing-toolbar/ListingToolbar'
import ListingRenderer from '@/components/listing/ListingRenderer'
import ActivityCard from './_components/ActivityCard'
import { useGetActivitiesQuery } from '@/lib/apis/activities/queries'
import { ActivitySearchParams, ActivityType } from '@/interfaces/activities.interfaces'
import { useSearch } from '@/hooks/use-search'
import { Tag } from 'lucide-react'
import { activitiesTypesConfigArray } from '@/utils/constants/activities'
import EmptyData from '@/components/common/EmptyData'
import ErrorData from '@/components/common/ErrorData'
import ActivitySkeleton from './_components/ActivitySkeleton'

const ActivitiesPage: React.FC = () => {
  const { searchValues, values, setValue } = useSearch<ActivitySearchParams>({
    initialValues: {
      page: 1,
      limit: 3,
      search: '',
      types: [],
    },
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
            <p className="text-secondary text-3xl sm:text-4xl md:text-5xl lg:text-5xl text-center font-khalid">أنشطة المسجد</p>
            <p className="text-foreground text-sm sm:text-base md:text-xl text-center max-w-2xl">
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
              placeholder: 'عنوان المقال، الكاتب ...',
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
