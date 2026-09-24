'use client'

import React, { useState } from 'react'
import { BookOpen, Plus, Hourglass, CalendarClock, AlertTriangle } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { Button } from '@/shared/ui/button'
import ListingRenderer from '@/shared/listing/ListingRenderer'
import EmptyData from '@/shared/common/EmptyData'
import ErrorData from '@/shared/common/ErrorData'
import { Pagination } from '@/shared/common/Pagination'
import { useGetAdminLoansQuery } from '@/features/admin/api/loans.queries'
import type { LoanStatus } from '@/utils/constants/loans'
import LoansTable from './LoansTable'
import LoansTableSkeleton from './LoansTableSkeleton'
import AddLoanDialog from './AddLoanDialog'

interface LoansPageProps {
  stats: {
    totalLoans: number
    pendingLoans: number
    extensionRequests: number
    overdueLoans: number
  }
}

const statCards = [
  { label: 'عدد الإعارات الإجمالي', key: 'totalLoans' as const, icon: BookOpen },
  { label: 'عدد طلبات الإعارة الحالية', key: 'pendingLoans' as const, icon: Hourglass },
  { label: 'عدد طلبات التمديد', key: 'extensionRequests' as const, icon: CalendarClock },
  { label: 'عدد التأخرات', key: 'overdueLoans' as const, icon: AlertTriangle },
]

const LOAN_TABS: Array<{ value: LoanStatus; label: string }> = [
  { value: 'pending', label: 'قيد الانتظار' },
  { value: 'accepted', label: 'مقبول' },
  { value: 'picked_up', label: 'تم الأخذ' },
  { value: 'returned', label: 'تم الإرجاع' },
  { value: 'refused', label: 'مرفوض' },
]

const PAGE_SIZE = 20

const Loans: React.FC<LoansPageProps> = ({ stats }) => {
  const [status, setStatus] = useState<LoanStatus>('pending')
  const [page, setPage] = useState(1)
  const [addLoanOpen, setAddLoanOpen] = useState(false)

  const {
    data: { docs: loans = [], totalPages = 1, totalDocs = 0 } = {},
    isLoading,
    isError,
  } = useGetAdminLoansQuery({ status, page, limit: PAGE_SIZE })

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
          value={status}
          onValueChange={(v) => {
            setStatus(v as LoanStatus)
            setPage(1)
          }}
        >
          <TabsList>
            {LOAN_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Button
          size="lg"
          className="gap-2 border border-primary bg-primary shadow-[inset_0px_4px_8px_1px_#ffffff99] hover:brightness-110 hover:shadow-[inset_0px_4px_8px_1px_#ffffff66,0_0_12px_rgba(13,233,195,0.7)] active:brightness-90 active:shadow-none"
          onClick={() => setAddLoanOpen(true)}
        >
          <Plus className="size-4" />
          إضافة إعارة
        </Button>
      </div>

      {/* Content */}
      <ListingRenderer
        isEmpty={totalDocs === 0}
        isError={isError}
        isLoading={isLoading}
        emptyFallback={<EmptyData title="لا توجد إعارات في هذه الحالة" />}
        errorFallback={<ErrorData />}
        loader={<LoansTableSkeleton />}
      >
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <LoansTable loans={loans} activeStatus={status} />
        </div>
        {totalPages > 1 ? (
          <div className="mt-6 flex justify-center">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} dir="rtl" />
          </div>
        ) : null}
      </ListingRenderer>

      {/* AddLoanDialog */}
      <AddLoanDialog open={addLoanOpen} onOpenChange={setAddLoanOpen} />
    </div>
  )
}

export default Loans
