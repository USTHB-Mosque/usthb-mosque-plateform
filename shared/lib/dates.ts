/** Formats a stored ISO date for Arabic-facing server messages: dd/MM/yyyy. */
export function formatArabicDate(value?: string | null): string {
  /* v8 ignore next 2 -- callers only format dates they just stamped */
  if (!value) return ''
  const date = new Date(value)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${day}/${month}/${date.getFullYear()}`
}

/** Adds whole days to a date without mutating the input. */
export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}
