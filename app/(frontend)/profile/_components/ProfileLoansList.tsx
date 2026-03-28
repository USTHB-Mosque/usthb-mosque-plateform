import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Book, Loan } from '@/payload-types'
import { format } from 'date-fns'
import { arDZ } from 'date-fns/locale'
import EmptyData from '@/components/common/EmptyData'
import { BookMarked } from 'lucide-react'

const statusLabels: Record<NonNullable<Loan['status']>, string> = {
  pending: 'قيد الانتظار',
  approved: 'موافق عليه',
  returned: 'مُعاد',
  overdue: 'متأخر',
}

type ProfileLoansListProps = {
  loans: Loan[]
}

const ProfileLoansList: React.FC<ProfileLoansListProps> = ({ loans }) => {
  if (loans.length === 0) {
    return (
      <Card className="p-6">
        <CardContent className="py-12">
          <EmptyData title="لا توجد إعارات مسجّلة" />
          <p className="text-center text-muted-foreground text-sm mt-2">
            عند طلب إعارة كتب من المكتبة ستظهر هنا.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {loans.map((loan) => {
        const book = loan.book as Book
        if (!book?.id) return null

        const loanDate = loan.loanDate ? new Date(loan.loanDate) : null
        const dueDate = loan.dueDate ? new Date(loan.dueDate) : null

        return (
          <Card key={loan.id} className="p-6">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <BookMarked className="size-5 text-primary shrink-0 mt-0.5" />
                  <CardTitle className="text-lg font-dubai leading-snug">{book.title}</CardTitle>
                </div>
                <Badge variant="outline" className="shrink-0">
                  {loan.status ? statusLabels[loan.status] : '—'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              {loanDate ? (
                <p>
                  تاريخ الإعارة:{' '}
                  <span className="text-foreground">
                    {format(loanDate, 'd MMMM yyyy', { locale: arDZ })}
                  </span>
                </p>
              ) : null}
              {dueDate ? (
                <p>
                  موعد الإرجاع:{' '}
                  <span className="text-foreground">
                    {format(dueDate, 'd MMMM yyyy', { locale: arDZ })}
                  </span>
                </p>
              ) : null}
              <Link
                href={`/library/book/${book.id}`}
                className="inline-flex text-primary font-medium text-sm underline-offset-4 hover:underline pt-1"
              >
                صفحة الكتاب
              </Link>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export default ProfileLoansList
