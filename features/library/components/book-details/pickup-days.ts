/**
 * The collection schedule the borrow dialog may offer (#153, D1).
 *
 * It lives outside the component because it is four rules that only ever
 * agree in combination — Friday is closed, today counts only while its hours
 * are still ahead of us, the 48h window stops at the day after tomorrow, and
 * none of it is visible by reading the DOM — so it earns a test of its own.
 */

/** The hours the desk staffs, in 24h form. Labels live in the dialog. */
export const PICKUP_TIME_SLOTS = ['11:00', '13:00'] as const

export type PickupOption = {
  /** Days after today; 0 is today, 1 tomorrow, 2 the day after. */
  offset: number
  date: Date
  /** The slots on `date` still ahead of the moment the dialog opened. */
  slots: string[]
}

function slotAt(date: Date, slot: string): Date {
  const [hours, minutes] = slot.split(':').map(Number)
  const at = new Date(date)
  at.setHours(hours, minutes, 0, 0)
  return at
}

/**
 * Today, tomorrow and the day after — no further, which is D1's 48h read off
 * the calendar: a day opens at midnight, so those three open inside
 * `from + 48h` and the day after that does not. Offering *today* is the
 * point — a member already on campus can collect within the hour, and a
 * schedule that starts at tomorrow told them no.
 *
 * Two rules prune that range. Friday is closed, so it is stepped over —
 * which is why Thursday offers Saturday instead of Friday, and Wednesday
 * stops at Thursday. And a day whose hours have all passed is dropped, so
 * `today` carries both slots in the morning, only the later one after noon,
 * and disappears by mid-afternoon while tomorrow keeps both.
 *
 * Never empty: the hours rule can only ever remove today, and two
 * consecutive days are never both Friday, so tomorrow or the day after is
 * always left standing.
 */
export function pickupDayOptions(from: Date): PickupOption[] {
  const bound = from.getTime() + 48 * 60 * 60 * 1000
  const options: PickupOption[] = []

  for (let offset = 0; offset <= 2 && options.length < 3; offset++) {
    const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + offset)
    if (date.getDay() === 5) continue // Friday: closed
    if (date.getTime() > bound) break // outside the window; later days are too
    const slots = PICKUP_TIME_SLOTS.filter((slot) => slotAt(date, slot).getTime() > from.getTime())
    if (slots.length === 0) continue // every hour of this day is behind us
    options.push({ offset, date, slots })
  }

  return options
}
