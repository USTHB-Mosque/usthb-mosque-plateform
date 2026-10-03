import { expect, test, type Page } from '@playwright/test'

import { adminStorageState, userStorageState } from './lib/auth-state'

test.use({ storageState: userStorageState })

// The journey book: 3 total / 2 available in the seed, untouched by the
// loan-journey spec (which borrows تفسير السعدي). Approving reserves one of
// its copies through the real admin-panel action.
const APPROVED_BOOK = 'الموافقات في أصول الشريعة'
// The seeded accepted loan the reminder flows through (its state is only
// read by the loan-journey seeded-state test, never driven).
const ACCEPTED_BOOK = 'صحيح مسلم'
const MEMBER_EMAIL = 'member1@e2e.mosque'
const MEMBER_NAME = 'العضو الأول'
const APPROVAL_TITLE = 'تم قبول طلب الإعارة'
const REMINDER_TITLE = 'تذكير باستلام الكتاب'

/** The unread badge only renders when the count is above zero. */
async function badgeCount(page: Page): Promise<number> {
  const badge = page.getByRole('button', { name: 'الإشعارات' }).locator('span.absolute')
  if ((await badge.count()) === 0) return 0
  const text = (await badge.textContent())?.trim() ?? '0'
  return Number.parseInt(text, 10) || 0
}

const UNREAD_EVENTS_KEY = 'e2e:notification-unread-events'

/**
 * Tally of the `unread` events the page's notification stream has delivered,
 * readable at any point via the returned counter.
 *
 * The stream sends `unread` for two reasons — when it opens, carrying the
 * current count, and when a new notification commits — and the assertions
 * below care only that a delivery *arrived*, never which of the two produced
 * it. That is what lets them survive a change of how the stream decides to
 * announce new rows (#140). `EventSource` is patched from an init script so it
 * is wrapped before the page's own code can open a stream, and the tally lives
 * in sessionStorage so it survives the member's own navigations instead of
 * resetting on each one.
 */
async function trackUnreadEvents(page: Page): Promise<() => Promise<number>> {
  await page.addInitScript((key) => {
    const native = window.EventSource
    class RecordingEventSource extends native {
      constructor(url: string | URL, init?: EventSourceInit) {
        super(url, init)
        this.addEventListener('unread', () => {
          const seen = Number(window.sessionStorage.getItem(key) ?? 0)
          window.sessionStorage.setItem(key, String(seen + 1))
        })
      }
    }
    window.EventSource = RecordingEventSource as unknown as typeof EventSource
  }, UNREAD_EVENTS_KEY)
  return () =>
    page.evaluate((key) => Number(window.sessionStorage.getItem(key) ?? 0), UNREAD_EVENTS_KEY)
}

test.describe('notification bell and inbox', () => {
  // The two tests share one user's notification state, so they run in one
  // worker in order — a parallel inbox mark-all would otherwise clear the
  // unread badge the first journey is waiting on.
  test.describe.configure({ mode: 'serial' })

  // A dev-mode admin panel has to compile on first visit, and the member's page
  // then sits idle for the length of the admin journey — which outlasts both
  // the global 45s timeout and the stream's 30s keep-alive.
  test.setTimeout(240_000)

  test('an approval reaches the live bell and the member marks it read', async ({
    page,
    browser,
  }) => {
    // --- Member: open a portal page with the bell live before anything changes ---
    const bell = page.getByRole('button', { name: 'الإشعارات' })
    const unreadEvents = await trackUnreadEvents(page)

    await page.goto('/user/my-loans')
    await expect(bell).toBeVisible({ timeout: 20_000 })

    // --- Member: request the loan through the real borrow dialog (retry-safe) ---
    await page.goto('/user/library')
    await expect(async () => {
      await page.getByRole('button', { name: 'عرض جدول' }).click({ timeout: 5_000 })
      // exact: the row's actions dropdown also carries the book name.
      await page.getByRole('button', { name: APPROVED_BOOK, exact: true }).click({ timeout: 5_000 })
      await expect(page).toHaveURL(/\/user\/library\/book\/\d+/, { timeout: 10_000 })
    }).toPass({ timeout: 90_000 })

    if (await page.getByText('لديك إعارة نشطة لهذا الكتاب').isVisible()) {
      // A previous attempt already holds an active loan for this book.
      await page.goto('/user/my-loans')
    } else {
      // Seeded copy counts: 3 total, 2 available; a fresh request holds no copy.
      await expect(page.getByText('3 / 2')).toBeVisible()
      await page.getByRole('button', { name: 'احجز الآن' }).click()
      await expect(page.getByRole('dialog', { name: 'طلب إعارة' })).toBeVisible()
      await page.getByRole('button', { name: 'تأكيد الطلب' }).click()
      await expect(page.getByText('تم تقديم طلب الإعارة بنجاح')).toBeVisible({ timeout: 30_000 })
      await expect(page).toHaveURL(/\/user\/my-loans/, { timeout: 30_000 })
    }

    // --- Both baselines are read here, with the member parked on the portal ---
    // The page does not navigate again before the assertion, so no further
    // `unread` event can be a reconnect's opening snapshot.
    await expect(page).toHaveURL(/\/user\/my-loans/, { timeout: 30_000 })
    // The badge is server-rendered, so this reading is already the settled one:
    // waiting for the stream's opening event first would instead read it while
    // that event's own refetch is still in flight.
    const baseline = await badgeCount(page)
    // Wait for the opening delivery so the event baseline is settled too —
    // otherwise a late-arriving snapshot would satisfy the assertion on its own.
    await expect.poll(unreadEvents, { timeout: 30_000 }).toBeGreaterThan(0)
    const baselineEvents = await unreadEvents()

    // --- Admin: accept the request through the real admin-panel action ---
    const adminContext = await browser.newContext({ storageState: adminStorageState })
    const adminPage = await adminContext.newPage()
    await adminPage.goto('/admin-panel/loans')
    const pendingRow = adminPage
      .locator('tr', { hasText: MEMBER_EMAIL })
      .filter({ hasText: APPROVED_BOOK })
      .first()
    // A previous attempt may already have approved this loan — then the row
    // sits on the accepted tab and its unread notification is what the badge
    // shows. The row's own refresh is the settle: the table is a client-side
    // query, so "no row" is only trusted after the wait window ends.
    let approved = false
    const pendingVisible = await pendingRow
      .waitFor({ state: 'visible', timeout: 30_000 })
      .then(() => true)
      .catch(() => false)
    if (pendingVisible) {
      // #100 reads the borrower's budget before approving, so a member already
      // holding an unreturned book stops at a warning whose confirm approves
      // directly — the plain `قبول طلب الإعارة` confirm is never reached.
      // member1 is seeded with active loans on purpose, so the warning is the
      // only path here; LoansTable.test.tsx covers the branch without it.
      const warning = adminPage.getByRole('dialog', { name: 'تنبيه قبل قبول الإعارة' })
      await expect(async () => {
        // A previous attempt can have left the warning open, and an open modal
        // hides the table from the a11y tree — so only click accept while it
        // is closed, or the retry could never resolve the button.
        if (!(await warning.isVisible().catch(() => false))) {
          await pendingRow
            .getByRole('button', { name: `قبول طلب ${MEMBER_NAME}` })
            .click({ timeout: 5_000 })
          await expect(warning).toBeVisible()
        }
        // exact: the bulk variant's confirm is `قبول الكل`.
        await warning.getByRole('button', { name: 'قبول', exact: true }).click()
      }).toPass({ timeout: 45_000 })
      await expect(adminPage.getByText('تم قبول الطلب')).toBeVisible({ timeout: 30_000 })
      approved = true
    }

    // --- Live delivery: the badge must rise without any member-side reload ---
    // Asserting an `unread` event reached the page, and that the badge follows,
    // says nothing about what made the stream emit: the two lines have to hold
    // together. The badge is the load-bearing one — it cannot rise without a
    // notification actually becoming unread — so a stray reconnect snapshot
    // cannot carry the assertion on its own.
    if (approved) {
      await expect(async () => {
        expect(await unreadEvents()).toBeGreaterThan(baselineEvents)
        expect(await badgeCount(page)).toBeGreaterThanOrEqual(baseline + 1)
      }).toPass({ timeout: 90_000 })
    } else if (baseline === 0) {
      // Neither a pending row nor a leftover badge — the loan never made it
      // through approval, so the journey has nothing left to drive.
      throw new Error('the loan was neither approved nor left an unread badge')
    }

    // --- Member: mark it read through the bell dropdown ---
    // The menu stays open across retries; its items refresh in place when the
    // bell refetches its state. Click this book's approval, not the possibly
    // unread approval left by another journey.
    await expect(async () => {
      if ((await page.getByRole('menu').count()) === 0) {
        await bell.click({ timeout: 5_000 })
        await expect(page.getByRole('menu')).toBeVisible({ timeout: 5_000 })
      }
      await page
        .getByRole('menuitem')
        .filter({ hasText: APPROVAL_TITLE })
        .filter({ hasText: APPROVED_BOOK })
        .first()
        .click({ timeout: 3_000 })
    }).toPass({ timeout: 90_000 })
    if (approved) {
      await expect(async () => {
        expect(await badgeCount(page)).toBe(baseline)
      }).toPass({ timeout: 45_000 })
    }

    // The count alone could drop optimistically even if the write failed.
    // Confirm that the clicked approval, specifically, persisted as read.
    await page.goto('/user/notifications')
    const approvalRow = page
      .locator('button', { hasText: APPROVAL_TITLE })
      .filter({ hasText: APPROVED_BOOK })
      .first()
    await expect(approvalRow).toBeVisible({ timeout: 30_000 })
    await expect(approvalRow.locator('span.h-2.w-2')).toHaveCount(0)

    await adminContext.close()
  })

  test('the notifications inbox lists the reminder and marks it read from the row', async ({
    page,
    browser,
  }) => {
    // --- Admin: send a pickup reminder for the seeded accepted loan ---
    const adminContext = await browser.newContext({ storageState: adminStorageState })
    const adminPage = await adminContext.newPage()
    await adminPage.goto('/admin-panel/loans')
    await adminPage.getByRole('tab', { name: 'مقبول' }).click()
    const acceptedRow = adminPage
      .locator('tr', { hasText: MEMBER_EMAIL })
      .filter({ hasText: ACCEPTED_BOOK })
      .first()
    await expect(acceptedRow).toBeVisible({ timeout: 30_000 })

    await expect(async () => {
      await acceptedRow
        .getByRole('button', { name: `إجراءات إعارة ${MEMBER_NAME}` })
        .click({ timeout: 5_000 })
      await adminPage
        .getByRole('menuitem', { name: 'إرسال تذكير بالاستلام' })
        .click({ timeout: 5_000 })
      await expect(adminPage.getByRole('dialog', { name: 'إرسال تذكير' })).toBeVisible({
        timeout: 10_000,
      })
    }).toPass({ timeout: 60_000 })
    await adminPage
      .getByRole('dialog', { name: 'إرسال تذكير' })
      .getByRole('button', { name: 'إرسال التذكير' })
      .click()
    await expect(adminPage.getByText('تم إرسال التذكير')).toBeVisible({ timeout: 30_000 })
    await adminContext.close()

    // --- Member: the inbox lists it unread; the row carries the my-loans link ---
    await page.goto('/user/notifications')
    const reminderRow = page.locator('button', { hasText: REMINDER_TITLE }).first()
    await expect(reminderRow).toBeVisible({ timeout: 30_000 })

    if ((await reminderRow.locator('span.h-2.w-2').count()) > 0) {
      // Clicking the unread row marks it read and follows its link.
      await expect(async () => {
        await reminderRow.click({ timeout: 5_000 })
        await expect(page).toHaveURL(/\/user\/my-loans/, { timeout: 15_000 })
      }).toPass({ timeout: 60_000 })
    }

    // Back on the inbox the reminder row is read — and the unread URL filter
    // no longer contains it.
    await page.goto('/user/notifications')
    const readRow = page.locator('button', { hasText: REMINDER_TITLE }).first()
    await expect(readRow.locator('span.h-2.w-2')).toHaveCount(0, { timeout: 15_000 })

    const unreadFilter = page.getByRole('button', { name: /غير المقروء/ })
    if ((await unreadFilter.count()) > 0 && (await unreadFilter.textContent())?.includes('(')) {
      await expect(async () => {
        await unreadFilter.click({ timeout: 5_000 })
        await expect(page).toHaveURL(/seen=unread/, { timeout: 15_000 })
        // The reminder was marked read above; the unread view must not list
        // it. Poll: the navigation can race the stale RSC payload.
        await expect(page.locator('button', { hasText: REMINDER_TITLE })).toHaveCount(0)
      }).toPass({ timeout: 45_000 })
    }

    // Mark-all only exists while something is unread; another test's
    // notification may or may not still be unread at this point.
    const markAll = page.getByRole('button', { name: 'تحديد الكل كمقروء' })
    if (await markAll.isVisible()) {
      await markAll.click()
      await expect(
        page.locator('button', { hasText: APPROVAL_TITLE }).locator('span.h-2.w-2'),
      ).toHaveCount(0, { timeout: 15_000 })
    }
  })
})
