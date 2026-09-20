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

function getDueDateStatus(dueDate: string | null | undefined): { label: string; className: string } | null {
  if (!dueDate) return null
  const due = new Date(dueDate).getTime()
  const now = Date.now()
  const diff = due - now
  const threeDays = 3 * 24 * 60 * 60 * 1000

  if (diff < 0) return { label: 'متأخر', className: 'bg-[#FF6B6B]/15 text-[#C0392B]' }
  if (diff <= threeDays) return { label: 'قريب الموعد', className: 'bg-[#FFB020]/15 text-[#B45309]' }
  return null
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

      <div className="overflow-x-auto rounded-xl">
        <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr className="border-b border-border bg-background-2">
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">الكتاب</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">الرمز</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">تاريخ الإرجاع</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">ساعة الإرجاع</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">الحالة</th>
              <th className="w-12 px-3 py-3 text-center" />
            </tr>
          </thead>
          <tbody>
            {loans.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
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
                    <td className="truncate px-4 py-3 text-muted-foreground">
                      {loan.id}
                    </td>
                    <td className="truncate px-4 py-3 text-muted-foreground">
                      {loan.dueDate
                        ? format(new Date(loan.dueDate), 'dd/MM/yyyy', { locale: arDZ })
                        : '—'}
                    </td>
                    <td className="truncate px-4 py-3 text-muted-foreground">
                      {loan.dueDate
                        ? format(new Date(loan.dueDate), 'hh:mm a', { locale: arDZ })
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {dueStatus ? (
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${dueStatus.className}`}>
                          {dueStatus.label}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-muted transition-colors cursor-pointer outline-none"
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

      <LoanDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        loan={detailsLoan}
      />
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
