import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { format } from 'date-fns'
import { arDZ } from 'date-fns/locale'
import type { Book, Loan, Media } from '@/payload-types'
import { cn } from '@/lib/utils'
import { getImageUrl } from '@/utils/image-utils'
import LoanStatusBadge from '../../my-loans/_components/LoanStatusBadge'

interface LoansPreviewProps {
  loans: Loan[]
  className?: string
}

const LoansPreview: React.FC<LoansPreviewProps> = ({ loans, className }) => {
  return (
    <section className={cn('rounded-2xl border border-border bg-card', className)}>
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-card-foreground">أحدث الإعارات</h2>
        <Link href="/user/my-loans" className="text-xs text-primary-300 hover:underline">
          عرض الكل
        </Link>
      </header>

      {loans.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">لا توجد إعارات حالية.</p>
      ) : (
        <ul className="divide-y divide-border">
          {loans.slice(0, 4).map((loan) => {
            const book = loan.book as Book | undefined
            const cover = book?.image as Media | undefined
            const due = loan.dueDate ? format(new Date(loan.dueDate), 'd MMM yyyy', { locale: arDZ }) : null

            return (
              <li key={loan.id}>
                <Link
                  href={`/user/library/book/${book?.id ?? ''}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  <Image
                    src={getImageUrl(cover?.url, '/static/images/quran.png')}
                    alt={book?.title || 'صورة الكتاب'}
                    width={40}
                    height={40}
                    className="size-10 shrink-0 rounded-md border border-border object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-card-foreground">
                      {book?.title || '—'}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{book?.author}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <LoanStatusBadge loan={loan} />
                    {due ? <span className="text-xs text-muted-foreground">{due}</span> : null}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default LoansPreview