/**
 * The one place a library card's state is written down (#145).
 *
 * PRD open question 3 asked whether cards are issued per verified member or
 * created by an admin, and what `archived` means. The answer is encoded here:
 *
 * - **Cards are issued automatically** when a member becomes verified
 *   (`ensureLibraryCard`), never by hand. The admin "add card" flow exists only
 *   to repair that: it issues the one card a verified member is missing, or
 *   brings a withdrawn one back into circulation.
 * - **One card per member, forever.** `cardId` is `M-` plus the member id, so
 *   the identity is stable and a replacement card is the *same* card returned to
 *   `active` rather than a second row.
 * - `active` — in circulation; the member may borrow.
 * - `inactive` — withdrawn but recoverable: the card is lost, being replaced, or
 *   under review. Nothing stops the member borrowing on paper terms; an admin
 *   returns it to `active` when it turns up.
 * - `archived` — retired for good (the member graduated or left). It is the only
 *   state that stamps `archivedAt`, and it is the only state with no way out:
 *   an archived card is kept for the history, not handed back.
 */
export const LIBRARY_CARD_STATUSES = [
  { value: 'active', label: 'فعالة' },
  { value: 'inactive', label: 'غير فعالة' },
  { value: 'archived', label: 'مأرشفة' },
] as const

export type LibraryCardStatus = (typeof LIBRARY_CARD_STATUSES)[number]['value']

export const LIBRARY_CARD_STATUS_LABELS: Record<LibraryCardStatus, string> = Object.fromEntries(
  LIBRARY_CARD_STATUSES.map((status) => [status.value, status.label]),
) as Record<LibraryCardStatus, string>

/** The retired-for-good state; the only one that keeps an `archivedAt` stamp. */
export const ARCHIVED_CARD_STATUS = 'archived' as const

/**
 * Which states each card can move to, and what the admin is told happened.
 *
 * The row menu and the server action both read this table so the two can never
 * disagree about what an admin may do: an archived card has exactly one way out,
 * and an active one cannot be reinstated because it never left.
 */
export const LIBRARY_CARD_TRANSITIONS: Record<
  LibraryCardStatus,
  Array<{ to: LibraryCardStatus; label: string; done: string }>
> = {
  active: [
    { to: 'inactive', label: 'سحب البطاقة', done: 'تم سحب البطاقة' },
    { to: 'archived', label: 'أرشفة البطاقة', done: 'تمت أرشفة البطاقة' },
  ],
  inactive: [
    { to: 'active', label: 'إعادة البطاقة للخدمة', done: 'أُعيدت البطاقة للخدمة' },
    { to: 'archived', label: 'أرشفة البطاقة', done: 'تمت أرشفة البطاقة' },
  ],
  archived: [{ to: 'active', label: 'إعادة البطاقة للخدمة', done: 'أُعيدت البطاقة للخدمة' }],
}

export function canTransitionCard(from: LibraryCardStatus, to: LibraryCardStatus): boolean {
  return LIBRARY_CARD_TRANSITIONS[from].some((transition) => transition.to === to)
}
