import type { Book, Loan } from '@/payload-types'

export interface CalendarMarkedEvent {
  date: string
  label: string
  kind: 'pickup' | 'return'
}

function bookTitle(loan: Loan): string {
  const book = loan.book as Book | undefined
  return book?.title ?? 'كتاب'
}

/**
 * Maps the pickups the dashboard loads onto calendar events. A pickup is the
 * day a member is due to collect a reserved copy at the mosque, so it is
 * marked from `pickupDate`, not from the due date.
 */
export function buildCalendarEventsForPickups(loans: Loan[] = []): CalendarMarkedEvent[] {
  return loans
    .filter((loan) => Boolean(loan.pickupDate))
    .map((loan) => ({
      date: loan.pickupDate as string,
      label: `استلام: ${bookTitle(loan)}`,
      kind: 'pickup' as const,
    }))
}

/**
 * Maps the upcoming returns the dashboard server action loads onto calendar
 * events so the Hijri/month calendar marks each due (return) day.
 */
export function buildCalendarEventsForLoans(loans: Loan[] = []): CalendarMarkedEvent[] {
  return loans
    .filter((loan) => Boolean(loan.dueDate))
    .map((loan) => ({
      date: loan.dueDate as string,
      label: `إرجاع: ${bookTitle(loan)}`,
      kind: 'return' as const,
    }))
}

/**
 * Both event kinds for one calendar: pickups first so the hover popover leads
 * with what the member must collect, then returns.
 */
export function buildCalendarEvents(
  pickups: Loan[] = [],
  returns: Loan[] = [],
): CalendarMarkedEvent[] {
  return [...buildCalendarEventsForPickups(pickups), ...buildCalendarEventsForLoans(returns)]
}
