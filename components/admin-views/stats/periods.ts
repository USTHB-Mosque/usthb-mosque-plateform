/**
 * The analytics period selector's whole contract (#156).
 *
 * It used to be two functions inside the view, and `resolveFrom` ignored its own
 * `months` argument and returned "now" for every option — so the three- and
 * six-month filters requested a window containing nothing and looked like a
 * dead control. It lives on its own, without the view's import graph, so the
 * behaviour is testable against a fixed clock instead of "whatever now is".
 */
export const PERIOD_OPTIONS = [
  { label: 'منذ بداية السنة', months: 12, startOfYear: true },
  { label: 'آخر 6 أشهر', months: 6, startOfYear: false },
  { label: 'آخر 3 أشهر', months: 3, startOfYear: false },
  { label: 'آخر شهر', months: 1, startOfYear: false },
] as const

export type AnalyticsPeriod = (typeof PERIOD_OPTIONS)[number]

/** The start of the window the given option asks the aggregations for. */
export function resolveFrom(months: number, startOfYear: boolean, now = new Date()): Date {
  if (startOfYear) return new Date(now.getFullYear(), 0, 1)
  const from = new Date(now)
  from.setMonth(from.getMonth() - months)
  return from
}
