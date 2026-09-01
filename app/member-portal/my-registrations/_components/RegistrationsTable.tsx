'use client'

import React, { useMemo } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { CalendarDays, MoreVertical, SlidersHorizontal } from 'lucide-react'
import { format } from 'date-fns'
import { arDZ } from 'date-fns/locale'
import { Activity, ActivityRegistration, Media } from '@/payload-types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import ListingToolbar from '@/components/listing/listing-toolbar/ListingToolbar'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Pagination } from '@/components/common/Pagination'
import EmptyData from '@/components/common/EmptyData'
import { useSearch } from '@/hooks/use-search'
import { getImageUrl } from '@/utils/image-utils'
import { activitiesTypesConfig } from '@/utils/constants/activities'
import RegistrationStatusBadge, {
  getEffectiveRegistrationStatus,
  isPastRegistration,
} from './RegistrationStatusBadge'

type RegistrationsFilters = {
  period: 'upcoming' | 'past'
  status: string
  search: string
  page: number
}

type RegistrationsTableProps = {
  registrations: ActivityRegistration[]
}

const PAGE_SIZE = 8

const statusOptions = [
  { value: '', label: 'الكل' },
  { value: 'registered', label: 'مسجّل' },
  { value: 'attended', label: 'تم الحضور' },
  { value: 'passed', label: 'مكتمل' },
]

const RegistrationsTable: React.FC<RegistrationsTableProps> = ({ registrations }) => {
  const router = useRouter()

  const { values, searchValues, setValue, reset } = useSearch<RegistrationsFilters>({
    initialValues: {
      period: 'upcoming',
      status: '',
      search: '',
      page: 1,
    },
    scope: 'member-registrations',
  })

  const { period, status, search } = searchValues

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()

    const list = registrations.filter((registration) => {
      const effective = getEffectiveRegistrationStatus(registration)
      const isPast = isPastRegistration(registration)
      if (period === 'past' ? !isPast : isPast) return false
      if (status && effective !== status) return false
      if (q) {
        const activity = registration.activity as Activity | undefined
        const typeLabel = activity ? activitiesTypesConfig[activity.type] ?? '' : ''
        const hay = [activity?.title, activity?.location, typeLabel]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })

    return [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }, [registrations, period, status, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const clampedPage = Math.min(values.page || 1, totalPages)
  const pageItems = filtered.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE)

  if (registrations.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="py-12">
          <EmptyData title="لم تسجّل في أي نشاط بعد" />
          <p className="mt-2 text-center text-sm text-muted-foreground">
            اطّلع على أنشطة المسجد وسجّل في ما يناسبك.
          </p>
          <div className="mt-6 flex justify-center">
            <Button
              type="button"
              onClick={() => router.push('/user/activities')}
              className="gap-2 rounded-lg"
            >
              <CalendarDays className="size-4" />
              تصفح الأنشطة
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <Tabs
          value={values.period}
          onValueChange={(v) => {
            setValue('period', v as RegistrationsFilters['period'])
            setValue('page', 1)
          }}
        >
          <TabsList>
            <TabsTrigger value="upcoming">تسجيلاتي القادمة</TabsTrigger>
            <TabsTrigger value="past">تسجيلاتي السابقة</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ListingToolbar
        onApplyFilters={() => setValue('page', 1)}
        quickFilterSections={[
          {
            id: 'status-quick',
            multiple: false,
            options: statusOptions,
            value: values.status || '',
            onChange: (v) => setValue('status', v as string),
          },
        ]}
        searchProps={{
          enabled: true,
          value: searchValues.search || '',
          onChange: (value) => {
            setValue('search', value)
            setValue('page', 1)
          },
          placeholder: 'اسم النشاط، الموقع ...',
        }}
        filterButtonClassName="bg-card"
      />

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="py-12">
            <EmptyData title="لا توجد نتائج مطابقة للتصفية" />
            <div className="mt-6 flex justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => reset()}
                className="gap-2 rounded-lg"
              >
                <SlidersHorizontal className="size-4" />
                مسح التصفية
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>النشاط</TableHead>
                  <TableHead>التصنيف</TableHead>
                  <TableHead>تاريخ النشاط</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="w-16 text-end">
                    <span className="sr-only">إجراءات</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((registration) => {
                  const activity = registration.activity as Activity | undefined
                  const cover = activity?.image as Media | undefined
                  const activityId = activity?.id
                  const start = activity?.startDate ? new Date(activity.startDate) : null
                  const typeLabel = activity
                    ? activitiesTypesConfig[activity.type] ?? 'نشاط'
                    : 'نشاط'

                  return (
                    <TableRow key={registration.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <Image
                            src={getImageUrl(cover?.url, '/static/images/quran.png')}
                            alt={activity?.title || 'صورة النشاط'}
                            width={40}
                            height={40}
                            className="h-10 w-10 shrink-0 rounded-md border border-border object-cover"
                          />
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => router.push(`/user/activities/${activityId}`)}
                              className="min-w-0 text-start text-foreground hover:text-primary-300 hover:underline"
                            >
                              <span className="block max-w-[240px] truncate">
                                {activity?.title || '—'}
                              </span>
                            </button>
                            {activity?.location ? (
                              <span className="block max-w-[240px] truncate text-xs font-normal text-muted-foreground">
                                {activity.location}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex h-7 items-center justify-center rounded-lg bg-[#0de9c3]/15 px-3 text-sm text-primary-300">
                          {typeLabel}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {start ? format(start, 'd MMM yyyy', { locale: arDZ }) : 'غير محدد'}
                      </TableCell>
                      <TableCell>
                        <RegistrationStatusBadge registration={registration} />
                      </TableCell>
                      <TableCell className="text-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <button
                                type="button"
                                aria-label={`خيارات ${activity?.title ?? 'التسجيل'}`}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                              />
                            }
                          >
                            <MoreVertical className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onSelect={() => router.push(`/user/activities/${activityId}`)}
                            >
                              تفاصيل النشاط
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 ? (
            <Pagination
              totalPages={totalPages}
              page={clampedPage}
              onPageChange={(page) => setValue('page', page)}
              dir="rtl"
              nextButtonLabel="التالي"
              previousButtonLabel="السابق"
            />
          ) : null}
        </>
      )}
    </div>
  )
}

export default RegistrationsTable
