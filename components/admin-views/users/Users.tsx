'use client'

import React, { useState } from 'react'
import {
  Upload,
  Plus,
  Users as UsersIcon,
  UserCheck,
  UserPlus,
  UserX,
  GraduationCap,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { Button } from '@/shared/ui/button'
import ListingRenderer from '@/shared/listing/ListingRenderer'
import ListingToolbar from '@/shared/listing/listing-toolbar/ListingToolbar'
import { useSearch } from '@/shared/hooks/use-search'
import EmptyData from '@/shared/common/EmptyData'
import ErrorData from '@/shared/common/ErrorData'
import { useGetUsersQuery } from '@/features/users/api/users.queries'
import type { UserSearchParams } from '@/features/users/types'
import UsersTable from './UsersTable'
import UsersTableSkeleton from './UsersTableSkeleton'
import AddUserDialog from './AddUserDialog'

interface UsersPageProps {
  stats: {
    totalUsers: number
    activeAccounts: number
    pendingJoinRequests: number
    inactiveAccounts: number
  }
}

const statCards = [
  { label: 'عدد المستخدمين', key: 'totalUsers' as const, icon: UsersIcon },
  { label: 'عدد الحسابات الفعالة', key: 'activeAccounts' as const, icon: UserCheck },
  { label: 'عدد طلبات الإنضمام', key: 'pendingJoinRequests' as const, icon: UserPlus },
  { label: 'عدد الحسابات غير الفعالة', key: 'inactiveAccounts' as const, icon: UserX },
]

const ROLE_TABS = {
  admin: 'admin',
  librarian: 'librarian',
  user: 'user',
} as const

const STATUS_FILTER_OPTIONS = [
  { value: 'pending_verification', label: 'قيد الانتظار' },
  { value: 'verified', label: 'مفعل' },
  { value: 'rejected', label: 'مرفوض' },
]

const FACULTY_OPTIONS = [
  { value: 'كلية العلوم', label: 'كلية العلوم' },
  { value: 'كلية الرياضيات والإعلام الآلي', label: 'كلية الرياضيات والإعلام الآلي' },
  { value: 'كلية الفيزياء', label: 'كلية الفيزياء' },
  { value: 'كلية الكيمياء', label: 'كلية الكيمياء' },
  { value: 'كلية علوم الطبيعة والحياة', label: 'كلية علوم الطبيعة والحياة' },
  { value: 'كلية الأرضية والعلوم', label: 'كلية الأرضية والعلوم' },
  { value: 'كلية الاقتصاد والتجارة', label: 'كلية الاقتصاد والتجارة' },
]

const STUDY_YEAR_OPTIONS = [
  { value: '1', label: 'السنة الأولى' },
  { value: '2', label: 'السنة الثانية' },
  { value: '3', label: 'السنة الثالثة' },
  { value: '4', label: 'السنة الرابعة' },
  { value: '5', label: 'السنة الخامسة' },
]

const Users: React.FC<UsersPageProps> = ({ stats }) => {
  const [addUserOpen, setAddUserOpen] = useState(false)

  const { searchValues, values, setValue } = useSearch<UserSearchParams>({
    initialValues: {
      page: 1,
      limit: 20,
      search: '',
      role: ROLE_TABS.user,
      verificationStatus: [],
      faculties: [],
      studyYears: [],
    },
    scope: 'admin-users',
  })

  const activeTab = values.role || ROLE_TABS.user

  const {
    data: { docs: users = [], totalPages = 1, totalDocs = 0 } = {},
    isLoading,
    isError,
  } = useGetUsersQuery(searchValues)

  return (
    <div className="flex flex-col gap-6">
      {/* Stat Cards */}
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

      {/* Tabs + Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            const val = v as 'admin' | 'librarian' | 'user'
            setValue('role', val)
            setValue('page', 1)
          }}
        >
          <TabsList>
            <TabsTrigger value={ROLE_TABS.admin}>المشرفين</TabsTrigger>
            <TabsTrigger value={ROLE_TABS.librarian}>أمناء المكتبة</TabsTrigger>
            <TabsTrigger value={ROLE_TABS.user}>المستخدمين</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="lg" className="gap-2">
            <Upload className="size-4" />
            استيراد ملف CSV
          </Button>
          <Button
            size="lg"
            className="gap-2 border border-primary bg-primary shadow-[inset_0px_4px_8px_1px_#ffffff99] hover:brightness-110 hover:shadow-[inset_0px_4px_8px_1px_#ffffff66,0_0_12px_rgba(13,233,195,0.7)] active:brightness-90 active:shadow-none"
            onClick={() => setAddUserOpen(true)}
          >
            <Plus className="size-4" />
            إضافة مستخدم
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div>
        <ListingToolbar
          onApplyFilters={() => setValue('page', 1)}
          quickFilterSections={[
            {
              id: 'status-quick',
              multiple: true,
              options: STATUS_FILTER_OPTIONS,
              value: values.verificationStatus || [],
              onChange: (v) => setValue('verificationStatus', v as string[]),
            },
          ]}
          searchProps={{
            enabled: true,
            value: searchValues.search || '',
            onChange: (value) => {
              setValue('search', value)
              setValue('page', 1)
            },
            placeholder: 'الاسم، البريد الإلكتروني، الهاتف ...',
          }}
          filterSections={[
            {
              id: 'faculties',
              title: 'الكلية',
              icon: <GraduationCap />,
              multiple: true,
              options: FACULTY_OPTIONS,
              value: values.faculties || [],
              onChange: (v) => setValue('faculties', v as string[]),
              resetValue: [],
            },
            {
              id: 'studyYears',
              title: 'سنة الدراسة',
              icon: <GraduationCap />,
              multiple: true,
              options: STUDY_YEAR_OPTIONS,
              value: values.studyYears || [],
              onChange: (v) => setValue('studyYears', v as string[]),
              resetValue: [],
            },
          ]}
          filterButtonClassName="bg-card"
        />
      </div>

      {/* Content */}
      <ListingRenderer
        isEmpty={totalDocs === 0}
        isError={isError}
        isLoading={isLoading}
        emptyFallback={<EmptyData title="لم يتم العثور على أي مستخدمين" />}
        errorFallback={<ErrorData />}
        loader={<UsersTableSkeleton />}
      >
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <UsersTable users={users} />
        </div>
        <div className="mt-6">{/* Pagination placeholder */}</div>
      </ListingRenderer>

      {/* AddUserDialog */}
      <AddUserDialog open={addUserOpen} onOpenChange={setAddUserOpen} />
    </div>
  )
}

export default Users
