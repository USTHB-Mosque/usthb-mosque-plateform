'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { arDZ } from 'date-fns/locale'
import { MoreHorizontal, Eye, XCircle } from 'lucide-react'
import LoanStatusBadge, { getEffectiveStatus, statusConfig } from './LoanStatusBadgeInline'
import type { Loan } from '@/payload-types'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { LoanRequestDetailsDialog } from '@/features/library'

interface LoanStatusTableProps {
  loans: Loan[]
}

const LoanStatusTable: React.FC<LoanStatusTableProps> = ({ loans }) => {
  const [detailsLoan, setDetailsLoan] = useState<Loan | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const openDetails = (loan: Loan) => {
    setDetailsLoan(loan)
    setDetailsOpen(true)
  }

  return (
    <section className="rounded-2xl border border-border p-4 sm:p-5">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-card-foreground">حالة طلبات الاستعارة</h2>
        <Link href="/user/my-loans" className="text-xs text-primary-300 hover:underline">
          عرض الكل
        </Link>
      </header>

      <ul className="divide-y divide-border sm:hidden">
        <li className="flex items-center justify-between gap-3 rounded-t-lg border-b border-border bg-background-2 px-4 py-3 text-right">
          <span className="w-[60%] font-medium text-muted-foreground md:w-[75%]">الكتاب</span>
          <span className="font-medium text-muted-foreground">تاريخ الأخذ</span>
          <span className="size-2.5 shrink-0" />
        </li>
        {loans.length === 0 ? (
          <li className="px-4 py-10 text-center text-muted-foreground">
            لا توجد طلبات استعارة حالياً.
          </li>
        ) : (
          loans.map((loan) => {
            const book = loan.book as { id?: number; title?: string } | undefined
            const status = getEffectiveStatus(loan)
            const config = statusConfig[status] ?? statusConfig.pending
            return (
              <li
                key={loan.id}
                onClick={() => openDetails(loan)}
                className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3"
              >
                <span className="min-w-0 w-[60%] font-medium text-card-foreground md:w-[75%]">
                  {book?.title || 'كتاب'}
                </span>
                <span className="shrink-0 text-sm text-muted-foreground">
                  {format(new Date(loan.loanDate), 'dd/MM/yyyy', { locale: arDZ })}
                </span>
                <span
                  className={`size-2.5 shrink-0 rounded-full ${config.dotClassName}`}
                  title={config.label}
                  aria-label={config.label}
                />
              </li>
            )
          })
        )}
      </ul>

      <div className="hidden overflow-x-auto rounded-xl sm:block">
        <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr className="border-b border-border bg-background-2">
              <th className="w-[35%] px-4 py-3 text-right font-medium text-muted-foreground xl:w-[31%]">
                الكتاب
              </th>
              <th className="w-1/4 px-4 py-3 text-right font-medium text-muted-foreground xl:w-1/5">
                الرمز
              </th>
              <th className="w-1/4 px-4 py-3 text-right font-medium text-muted-foreground xl:w-1/5">
                تاريخ الأخذ
              </th>
              <th className="w-[15%] px-4 py-3 text-center font-medium text-muted-foreground xl:w-1/5 xl:text-right">
                <span className="xl:hidden" aria-hidden="true">
                  &nbsp;
                </span>
                <span className="hidden xl:inline">حالة الطلب</span>
              </th>
              <th className="hidden px-3 py-3 text-center xl:w-[9%] xl:table-cell" />
            </tr>
          </thead>
          <tbody>
            {loans.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                  لا توجد طلبات استعارة حالياً.
                </td>
              </tr>
            ) : (
              loans.map((loan) => {
                const book = loan.book as { id?: number; title?: string } | undefined
                return (
                  <tr
                    key={loan.id}
                    className="border-b border-border last:border-0 hover:bg-muted/40 cursor-pointer"
                    onClick={() => openDetails(loan)}
                  >
                    <td className="truncate px-4 py-3 font-medium text-card-foreground">
                      {book?.title || 'كتاب'}
                    </td>
                    <td className="truncate px-4 py-3 text-muted-foreground">{loan.id}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {format(new Date(loan.loanDate), 'dd/MM/yyyy', { locale: arDZ })}
                    </td>
                    <td className="py-3 pl-3 pr-1 text-left xl:px-0 xl:text-right">
                      {(() => {
                        const status = getEffectiveStatus(loan)
                        const config = statusConfig[status] ?? statusConfig.pending
                        return (
                          <>
                            <span
                              className={`inline-block size-2.5 rounded-full align-middle ${config.dotClassName} xl:hidden`}
                              title={config.label}
                              aria-label={config.label}
                            />
                            <span
                              className={`hidden whitespace-nowrap rounded-full px-2.5 py-0.5 text-center text-xs font-medium xl:inline-block xl:min-w-[90px] ${config.className}`}
                            >
                              {config.label}
                            </span>
                          </>
                        )
                      })()}
                    </td>
                    <td className="px-3 py-3 text-center hidden xl:table-cell xl:px-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="ms-auto flex items-center justify-center h-8 w-8 rounded-lg hover:bg-muted transition-colors cursor-pointer outline-none"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="size-4 text-muted-foreground" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              openDetails(loan)
                            }}
                          >
                            <Eye className="me-2 size-4" />
                            التفاصيل
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              // TODO: Cancel loan
                            }}
                            variant="destructive"
                          >
                            <XCircle className="me-2 size-4" />
                            الغاء الطلب
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border bg-card px-4 py-3 xl:hidden">
        <span className="text-xs font-medium text-muted-foreground">حالة الطلب:</span>
        {Object.entries(statusConfig).map(([key, config]) => (
          <span key={key} className="flex items-center gap-1.5 text-xs text-card-foreground">
            <span className={`inline-block size-2.5 rounded-full ${config.dotClassName}`} />
            {config.label}
          </span>
        ))}
      </div>

      <LoanRequestDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        loan={detailsLoan}
      />
    </section>
  )
}

export default LoanStatusTable
