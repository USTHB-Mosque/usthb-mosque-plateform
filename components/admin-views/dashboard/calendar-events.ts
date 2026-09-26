import type { Book, Loan } from '@/payload-types'

export interface CalendarMarkedEvent {
  date: string
  label: string
}

/**
 * Maps the upcoming returns the dashboard server action loads onto calendar
 * events so the Hijri/month calendar marks each due (return) day.
 */
export function buildCalendarEventsForLoans(loans: Loan[]): CalendarMarkedEvent[] {
  return loans
    .filter((loan) => Boolean(loan.dueDate))
    .map((loan) => {
      const book = loan.book as Book | undefined
      return {
        date: loan.dueDate as string,
        label: book?.title ?? 'إرجاع كتاب',
      }
    })
}
