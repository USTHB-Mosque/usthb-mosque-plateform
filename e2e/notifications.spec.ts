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

test.describe('notification stream and bell', () => {
  // The two tests share one user's notification state, so they run in one
  // worker in order — a parallel inbox mark-all would otherwise clear the
  // unread badge the SSE journey is waiting on.
  test.describe.configure({ mode: 'serial' })

  // The SSE stream pushes the unread count at most every 30s; dev-mode admin
  // panel first compiles far exceed the global 45s test timeout.
  test.setTimeout(240_000)

  test('the live bell reacts to an approval over SSE and the member marks it read', async ({
    page,
    browser,
  }) => {
    // --- Member: open a portal page with the bell live before anything changes ---
    const bell = page.getByRole('button', { name: 'الإشعارات' })

    await page.goto('/user/my-loans')
    await expect(bell).toBeVisible({ timeout: 20_000 })
    const baseline = await badgeCount(page)

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
    // shows. The row's own 30s visibility poll is the settle: the table is a
    // client-side query, so "no row" is only trusted after the window ends.
    let approved = false
    const pendingVisible = await pendingRow
      .waitFor({ state: 'visible', timeout: 30_000 })
      .then(() => true)
      .catch(() => false)
    if (pendingVisible) {
      await expect(async () => {
        await pendingRow
          .getByRole('button', { name: `قبول طلب ${MEMBER_NAME}` })
          .click({ timeout: 5_000 })
        await expect(adminPage.getByRole('dialog', { name: 'قبول طلب الإعارة' })).toBeVisible()
      }).toPass({ timeout: 45_000 })
      await adminPage
        .getByRole('dialog', { name: 'قبول طلب الإعارة' })
        .getByRole('button', { name: 'قبول الطلب' })
        .click()
      await expect(adminPage.getByText('تم قبول الطلب')).toBeVisible({ timeout: 30_000 })
      approved = true
    }

    // --- SSE: the badge must rise without any member-side reload ---
    // 90s: the stream ticks every 30s from connect, and a dropped connection
    // under parallel load restarts that cycle on reconnect.
    if (approved && baseline === 0) {
      await expect(async () => {
        expect(await badgeCount(page)).toBeGreaterThanOrEqual(1)
      }).toPass({ timeout: 90_000 })
    } else if (!approved && baseline === 0) {
      // Neither a pending row nor a leftover badge — the loan never made it
      // through approval, so the journey has nothing left to drive.
      throw new Error('the loan was neither approved nor left an unread badge')
    }

    // --- Member: mark it read through the bell dropdown ---
    // The menu stays open across retries; its items refresh in place when the
    // next SSE tick refetches the bell state, so keep the menu open and click
    // the approval item as soon as it appears — that may take a full 30s tick
    // when another test's notification raised the badge first.
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
    // The bell's optimistic state clears the badge instantly on a fresh run;
    // after another test's mark-all a leftover badge clears on the next SSE
    // tick, so poll for the end state instead of a single check.
    await expect(async () => {
      expect(await badgeCount(page)).toBe(0)
    }).toPass({ timeout: 45_000 })

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
