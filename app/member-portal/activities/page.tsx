'use client'

import React from 'react'
import { Tag } from 'lucide-react'
import UserPage from '@/app/member-portal/UserPage'
import { Pagination } from '@/shared/common/Pagination'
import ListingRenderer from '@/shared/listing/ListingRenderer'
import ListingToolbar from '@/shared/listing/listing-toolbar/ListingToolbar'
import ActivityCard from '@/features/activities/components/ActivityCard'
import ActivitySkeleton from '@/features/activities/components/ActivitySkeleton'
import EmptyData from '@/shared/common/EmptyData'
import ErrorData from '@/shared/common/ErrorData'
import { useGetActivitiesQuery } from '@/features/activities/api/activities.queries'
import { useSearch } from '@/shared/hooks/use-search'
import { ActivitySearchParams, ActivityType } from '@/features/activities/types'
import { activitiesTypesConfigArray } from '@/utils/constants/activities'

const MemberActivitiesPage: React.FC = () => {
  const { searchValues, values, setValue } = useSearch<ActivitySearchParams>({
    initialValues: {
      page: 1,
      limit: 3,
      search: '',
      types: [],
    },
    scope: 'member-activities',
  })

  const {
    data: { docs: activities = [], totalPages = 1, totalDocs = 0 } = {},
    isLoading,
    isError,
  } = useGetActivitiesQuery(searchValues)

  return (
    <UserPage title="الأنشطة">
      <div className="mt-6">
        <ListingToolbar
          onApplyFilters={() => setValue('page', 1)}
          quickFilterSections={[
            {
              id: 'types-quick',
              multiple: false,
              options: [
                { value: '', label: 'الكل' },
                ...activitiesTypesConfigArray,
              ],
              value: (values.types || [])[0] || '',
              onChange: (v) => setValue('types', v ? [v as ActivityType] : []),
            },
          ]}
          searchProps={{
            enabled: true,
            value: searchValues.search || '',
            onChange: (value) => {
              setValue('search', value)
              setValue('page', 1)
            },
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
          filterButtonClassName="bg-card"
        />
      </div>

      <div className="mt-6">
        <ListingRenderer
          isEmpty={totalDocs === 0}
          isError={isError}
          isLoading={isLoading}
          emptyFallback={<EmptyData title="لم يتم العثور على أي أنشطة" />}
          errorFallback={<ErrorData />}
          loader={
            <div className="flex flex-col space-y-6">
              {Array.from({ length: 3 }).map((_, index) => (
                <ActivitySkeleton key={index} />
              ))}
            </div>
          }
        >
          <div className="flex flex-col space-y-6">
            {activities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                href={`/user/activities/${activity.id}`}
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

export default MemberActivitiesPage