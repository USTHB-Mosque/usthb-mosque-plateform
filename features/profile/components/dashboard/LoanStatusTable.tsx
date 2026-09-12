import React from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { arDZ } from 'date-fns/locale'
import { MoreHorizontal } from 'lucide-react'
import type { Loan } from '@/payload-types'
import LoanStatusBadge from './LoanStatusBadgeInline'

interface LoanStatusTableProps {
  loans: Loan[]
}

const LoanStatusTable: React.FC<LoanStatusTableProps> = ({ loans }) => {
  return (
    <section className="rounded-2xl border border-border p-4 sm:p-5">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-card-foreground">حالة طلبات الاستعارة</h2>
        <Link href="/user/my-loans" className="text-xs text-primary-300 hover:underline">
          عرض الكل
        </Link>
      </header>

      <div className="overflow-hidden rounded-xl">
        <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr className="border-b border-border bg-background-2">
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">الكتاب</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">الرمز</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">تاريخ الأخذ</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">حالة الطلب</th>
              <th className="w-12 px-3 py-3 text-center" />
            </tr>
          </thead>
          <tbody>
            {loans.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  لا توجد طلبات استعارة حالياً.
                </td>
              </tr>
            ) : (
              loans.map((loan) => {
                const book = loan.book as { title?: string } | undefined
                return (
                  <tr key={loan.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="truncate px-4 py-3 font-medium text-card-foreground">
                      {book?.title || 'كتاب'}
                    </td>
                    <td className="truncate px-4 py-3 text-muted-foreground">
                      {loan.id}
                    </td>
                    <td className="truncate px-4 py-3 text-muted-foreground">
                      {format(new Date(loan.loanDate), 'dd/MM/yyyy', { locale: arDZ })}
                    </td>
                    <td className="px-4 py-3">
                      <LoanStatusBadge loan={loan} />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button className="rounded-lg p-1 hover:bg-muted" aria-label="خيارات">
                        <MoreHorizontal className="size-4 text-muted-foreground" />
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default LoanStatusTable
