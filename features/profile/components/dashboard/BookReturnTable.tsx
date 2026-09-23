'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { arDZ } from 'date-fns/locale'
import { MoreHorizontal, Eye, Clock } from 'lucide-react'
import type { Book, Loan } from '@/payload-types'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { LoanDetailsDialog } from '@/features/library'
import { ExtensionDialog } from '@/features/library'

interface BookReturnTableProps {
  loans: Loan[]
  className?: string
}

const STATUS_LEGEND = [
  { label: 'متأخر', dotClassName: 'bg-[#C0392B]' },
  { label: 'قريب الموعد', dotClassName: 'bg-[#B45309]' },
  { label: 'ضمن الموعد', dotClassName: 'bg-[#22C55E]' },
]

function getDueDateStatus(
  dueDate: string | null | undefined,
): { label: string; dotClassName: string; badgeClassName: string } | null {
  if (!dueDate) return null
  const due = new Date(dueDate).getTime()
  const now = Date.now()
  const diff = due - now
  const threeDays = 3 * 24 * 60 * 60 * 1000

  if (diff < 0)
    return {
      label: 'متأخر',
      dotClassName: 'bg-[#C0392B]',
      badgeClassName: 'bg-[#FF6B6B]/15 text-[#C0392B]',
    }
  if (diff <= threeDays)
    return {
      label: 'قريب الموعد',
      dotClassName: 'bg-[#B45309]',
      badgeClassName: 'bg-[#FFB020]/15 text-[#B45309]',
    }
  return {
    label: 'ضمن الموعد',
    dotClassName: 'bg-[#22C55E]',
    badgeClassName: 'bg-[#22C55E]/15 text-[#15803D]',
  }
}

const BookReturnTable: React.FC<BookReturnTableProps> = ({ loans, className }) => {
  const [detailsLoan, setDetailsLoan] = useState<Loan | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [extensionLoan, setExtensionLoan] = useState<Loan | null>(null)
  const [extensionOpen, setExtensionOpen] = useState(false)

  const openDetails = (loan: Loan) => {
    setDetailsLoan(loan)
    setDetailsOpen(true)
  }

  return (
    <section className={`rounded-2xl border border-border p-4 sm:p-5 ${className ?? ''}`}>
      <header className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-card-foreground">مواعيد إرجاع الكتب</h2>
        <Link href="/user/my-loans" className="text-xs text-primary-300 hover:underline">
          عرض الكل
        </Link>
      </header>

      <ul className="divide-y divide-border sm:hidden">
        <li className="flex items-center justify-between gap-3 rounded-t-lg border-b border-border bg-background-2 px-4 py-3 text-right">
          <span className="w-[60%] font-medium text-muted-foreground md:w-[75%]">الكتاب</span>
          <span className="font-medium text-muted-foreground">تاريخ الإرجاع</span>
          <span className="size-2.5 shrink-0" />
        </li>
        {loans.length === 0 ? (
          <li className="px-2 py-10 text-center text-muted-foreground">لا توجد إعارات حالية.</li>
        ) : (
          loans.map((loan) => {
            const book = loan.book as { id?: number; title?: string } | undefined
            const dueStatus = getDueDateStatus(loan.dueDate)
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
                  {loan.dueDate
                    ? format(new Date(loan.dueDate), 'dd/MM/yyyy', { locale: arDZ })
                    : '—'}
                </span>
                {dueStatus && (
                  <span
                    className={`size-2.5 shrink-0 rounded-full ${dueStatus.dotClassName}`}
                    title={dueStatus.label}
                    aria-label={dueStatus.label}
                  />
                )}
              </li>
            )
          })
        )}
      </ul>

      <div className="hidden sm:block">
        <div className="overflow-x-auto rounded-xl">
          <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr className="border-b border-border bg-background-2">
                <th className="w-1/4 px-4 py-3 text-right font-medium text-muted-foreground lg:w-[35%] xl:w-[24%]">
                  الكتاب
                </th>
                <th className="w-1/5 px-4 py-3 text-right font-medium text-muted-foreground lg:w-1/4 xl:w-1/6">
                  الرمز
                </th>
                <th className="w-1/5 px-4 py-3 text-right font-medium text-muted-foreground lg:w-1/4 xl:w-1/6">
                  تاريخ الإرجاع
                </th>
                <th className="hidden w-1/5 px-4 py-3 text-right font-medium text-muted-foreground sm:table-cell lg:hidden xl:table-cell xl:w-1/6">
                  ساعة الإرجاع
                </th>
                <th className="w-[15%] px-4 py-3 text-center font-medium text-muted-foreground xl:w-1/6 xl:text-right">
                  <span className="xl:hidden" aria-hidden="true">
                    &nbsp;
                  </span>
                  <span className="hidden xl:inline">الحالة</span>
                </th>
                <th className="hidden px-3 py-3 text-center xl:w-[9%] xl:table-cell" />
              </tr>
            </thead>
            <tbody>
              {loans.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    لا توجد إعارات حالية.
                  </td>
                </tr>
              ) : (
                loans.map((loan) => {
                  const book = loan.book as { id?: number; title?: string } | undefined
                  const dueStatus = getDueDateStatus(loan.dueDate)
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
                        {loan.dueDate
                          ? format(new Date(loan.dueDate), 'dd/MM/yyyy', { locale: arDZ })
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground sm:table-cell lg:hidden xl:table-cell">
                        {loan.dueDate
                          ? format(new Date(loan.dueDate), 'hh:mm a', { locale: arDZ })
                          : '—'}
                      </td>
                      <td className="py-3 pl-3 pr-1 text-left xl:px-0 xl:text-right">
                        {dueStatus ? (
                          <>
                            <span
                              className={`inline-block size-2.5 rounded-full align-middle ${dueStatus.dotClassName} xl:hidden`}
                              title={dueStatus.label}
                              aria-label={dueStatus.label}
                            />
                            <span
                              className={`hidden whitespace-nowrap rounded-full px-2.5 py-0.5 text-center text-xs font-medium xl:inline-block xl:min-w-[90px] ${dueStatus.badgeClassName}`}
                            >
                              {dueStatus.label}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="xl:hidden inline-block size-2.5 rounded-full bg-muted-foreground/30" />
                            <span className="hidden text-muted-foreground xl:inline">—</span>
                          </>
                        )}
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
                                setExtensionLoan(loan)
                                setExtensionOpen(true)
                              }}
                            >
                              <Clock className="me-2 size-4" />
                              طلب تمديد
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
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border bg-card px-4 py-3 xl:hidden">
        <span className="text-xs font-medium text-muted-foreground">الحالة:</span>
        {STATUS_LEGEND.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5 text-xs text-card-foreground">
            <span className={`inline-block size-2.5 rounded-full ${item.dotClassName}`} />
            {item.label}
          </span>
        ))}
      </div>

      <LoanDetailsDialog open={detailsOpen} onOpenChange={setDetailsOpen} loan={detailsLoan} />
      <ExtensionDialog
        open={extensionOpen}
        onOpenChange={setExtensionOpen}
        onConfirm={(days) => {
          console.log('Extension requested:', { loanId: extensionLoan?.id, days })
          setExtensionOpen(false)
          setExtensionLoan(null)
        }}
        bookTitle={(extensionLoan?.book as Book | undefined)?.title}
      />
    </section>
  )
}

export default BookReturnTable
