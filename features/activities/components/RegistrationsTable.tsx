'use client'

import React, { useMemo } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { CalendarDays, MoreVertical, SlidersHorizontal } from 'lucide-react'
import { format } from 'date-fns'
import { arDZ } from 'date-fns/locale'
import { Activity, ActivityRegistration, Media } from '@/payload-types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import ListingToolbar from '@/shared/listing/listing-toolbar/ListingToolbar'
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { Pagination } from '@/shared/common/Pagination'
import EmptyData from '@/shared/common/EmptyData'
import { useSearch } from '@/shared/hooks/use-search'
import { getImageUrl } from '@/shared/lib/image-utils'
import { activitiesTypesConfig } from '@/utils/constants/activities'
import RegistrationStatusBadge, {
  getEffectiveRegistrationStatus,
  isPastRegistration,
  statusConfig,
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
        const typeLabel = activity ? (activitiesTypesConfig[activity.type] ?? '') : ''
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
          <div className="overflow-hidden rounded-lg border border-border bg-card lg:hidden">
            <ul className="divide-y divide-border">
              <li className="flex items-center justify-between gap-3 rounded-t-lg border-b border-border bg-background-2 px-4 py-3 text-right">
                <span className="min-w-0 max-w-[128px] flex-1 font-medium text-muted-foreground">
                  النشاط
                </span>
                <span className="w-[84px] shrink-0 text-center font-medium text-muted-foreground">
                  التصنيف
                </span>
                <span className="w-[92px] shrink-0 font-medium text-muted-foreground">
                  تاريخ النشاط
                </span>
                <span className="size-2.5 shrink-0" />
              </li>
              {pageItems.map((registration) => {
                const activity = registration.activity as Activity | undefined
                const activityId = activity?.id
                const status = getEffectiveRegistrationStatus(registration)
                const config = statusConfig[status]
                const start = activity?.startDate ? new Date(activity.startDate) : null
                const typeLabel = activity
                  ? (activitiesTypesConfig[activity.type] ?? 'نشاط')
                  : 'نشاط'
                return (
                  <li
                    key={registration.id}
                    onClick={() => router.push(`/user/activities/${activityId}`)}
                    className="flex cursor-pointer items-center justify-between gap-3 bg-background px-4 py-3"
                  >
                    <div className="min-w-0 max-w-[128px] flex-1">
                      <span className="block truncate font-medium text-card-foreground">
                        {activity?.title || '—'}
                      </span>
                      {activity?.shortDescription ? (
                        <span className="block truncate text-xs text-muted-foreground">
                          {activity.shortDescription}
                        </span>
                      ) : null}
                    </div>
                    <span className="flex h-6 w-[84px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#0de9c3]/15 px-1 text-xs whitespace-nowrap text-primary-300">
                      {typeLabel}
                    </span>
                    <span className="w-[92px] shrink-0 text-start text-sm text-muted-foreground">
                      {start ? format(start, 'd MMM yyyy', { locale: arDZ }) : 'غير محدد'}
                    </span>
                    <span
                      className={`size-2.5 shrink-0 rounded-full ${config.dotClassName}`}
                      title={config.label}
                      aria-label={config.label}
                    />
                  </li>
                )
              })}
            </ul>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border bg-background-2 px-4 py-3">
              {Object.values(statusConfig).map((config) => (
                <span
                  key={config.label}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <span className={`size-2.5 shrink-0 rounded-full ${config.dotClassName}`} />
                  {config.label}
                </span>
              ))}
            </div>
          </div>

          <div className="hidden overflow-hidden rounded-lg border border-border bg-card lg:block">
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
                    ? (activitiesTypesConfig[activity.type] ?? 'نشاط')
                    : 'نشاط'

                  return (
                    <TableRow
                      key={registration.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/user/activities/${activityId}`)}
                    >
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
                            className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-muted transition-colors cursor-pointer outline-none"
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation()
                                router.push(`/user/activities/${activityId}`)
                              }}
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
