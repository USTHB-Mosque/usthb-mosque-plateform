import { expect, test, type Page } from '@playwright/test'

import { adminStorageState, userStorageState } from './lib/auth-state'
import { clickUntilNavigated } from './lib/ui'

test.use({ storageState: userStorageState })

const BORROWED_BOOK = 'تفسير السعدي'

test.describe('loan lifecycle', () => {
  test('member borrows through the dialog and the admin drives the lifecycle states', async ({
    page,
    browser,
  }) => {
    // The journey crosses member + admin surfaces; dev-mode first compiles of
    // each page far exceed the global 45s test timeout.
    test.setTimeout(240_000)

    // --- Member: request the loan through the real borrow dialog ---
    await page.goto('/user/library')
    // The default grid card nests its title button under an overlay; the table
    // view exposes plain clickable title cells. A click can be swallowed
    // before hydration, so retry the whole switch-then-open chain.
    await expect(async () => {
      await page.getByRole('button', { name: 'عرض جدول' }).click({ timeout: 5_000 })
      await page.getByRole('button', { name: BORROWED_BOOK }).click({ timeout: 5_000 })
      await expect(page).toHaveURL(/\/user\/library\/book\/\d+/, { timeout: 10_000 })
    }).toPass({ timeout: 90_000 })
    const bookUrl = page.url()

    const alreadyBorrowed = await page.getByText('لديك إعارة نشطة لهذا الكتاب').isVisible()
    if (!alreadyBorrowed) {
      // Seeded copy counts: 6 total, 4 available — nothing is reserved yet,
      // because a fresh request holds no copy.
      await expect(page.getByText('6 / 4')).toBeVisible()

      await page.getByRole('button', { name: 'احجز الآن' }).click()
      await expect(page.getByRole('dialog', { name: 'طلب إعارة' })).toBeVisible()
      await page.getByRole('button', { name: 'تأكيد الطلب' }).click()
      await expect(page.getByText('تم تقديم طلب الإعارة بنجاح')).toBeVisible({ timeout: 30_000 })
      await expect(page).toHaveURL(/\/user\/my-loans/, { timeout: 30_000 })
    }

    const borrowedRow = page.locator('tr', { hasText: BORROWED_BOOK }).first()
    await expect(borrowedRow).toBeVisible({ timeout: 20_000 })

    // --- Admin: accept the request through the Payload admin edit view ---
    const adminContext = await browser.newContext({ storageState: adminStorageState })
    const adminPage = await adminContext.newPage()

    // A retry may resume from any lifecycle state; each phase re-reads the
    // fresh status from the loans list and only drives what is left.
    let status = await loanStatusFromList(adminPage, BORROWED_BOOK)
    if (status === 'قيد الانتظار') {
      await openLoanEdit(adminPage, BORROWED_BOOK)
      await setAdminStatus(adminPage, 'مقبول')

      // Accepting reserves a copy; the member-side detail page reflects it.
      await page.goto(bookUrl)
      await expect(page.getByText('6 / 3')).toBeVisible({ timeout: 20_000 })

      await page.goto('/user/my-loans')
      await expect(
        page.locator('tr', { hasText: BORROWED_BOOK }).first().getByText('مقبول'),
      ).toBeVisible({ timeout: 20_000 })
    } else {
      // Already accepted by a previous attempt.
      expect(status).toBe('مقبول')
    }

    // --- Admin: mark picked up ---
    status = await loanStatusFromList(adminPage, BORROWED_BOOK)
    if (status === 'مقبول') {
      await openLoanEdit(adminPage, BORROWED_BOOK)
      await setAdminStatus(adminPage, 'تم الأخذ')

      await page.goto('/user/my-loans')
      const pickedRow = page.locator('tr', { hasText: BORROWED_BOOK }).first()
      await expect(pickedRow.getByText('تم الأخذ')).toBeVisible({ timeout: 20_000 })
      // A picked-up loan carries a stamped due date, so the due cell is no dash.
      await expect(pickedRow.getByText('—')).toHaveCount(0)
    }

    // --- Admin: mark returned; the loan moves to the member's past tab ---
    status = await loanStatusFromList(adminPage, BORROWED_BOOK)
    if (status === 'تم الأخذ') {
      await openLoanEdit(adminPage, BORROWED_BOOK)
      await setAdminStatus(adminPage, 'تم الإرجاع')

      await page.goto('/user/my-loans')
      await page.getByRole('tab', { name: 'طلباتي السابقة' }).click()
      const pastRow = page.locator('tr', { hasText: BORROWED_BOOK }).first()
      await expect(pastRow.getByText('تم الإرجاع')).toBeVisible({ timeout: 20_000 })
    }

    await adminContext.close()
  })

  test('my-loans shows the seeded loan states across the current and past tabs', async ({
    page,
  }) => {
    await page.goto('/user/my-loans')

    // Seeded deterministically by utils/seed/e2e-fixtures.ts.
    await expect(
      page.locator('tr', { hasText: 'صحيح مسلم' }).first().getByText('مقبول'),
    ).toBeVisible({ timeout: 20_000 })
    await expect(
      page.locator('tr', { hasText: 'صحيح البخاري' }).first().getByText('تم الأخذ'),
    ).toBeVisible()
    await expect(
      page.locator('tr', { hasText: 'رياض الصالحين' }).first().getByText('قيد الانتظار'),
    ).toBeVisible()

    await page.getByRole('tab', { name: 'طلباتي السابقة' }).click()
    await expect(
      page.locator('tr', { hasText: 'العقيدة الواسطية' }).first().getByText('تم الإرجاع'),
    ).toBeVisible({ timeout: 20_000 })
  })
})

/** Reads the loan's status cell from a fresh loans list view. */
async function loanStatusFromList(adminPage: Page, bookTitle: string): Promise<string> {
  await adminPage.goto('/admin/collections/loans')
  const row = adminPage.locator('tr', { hasText: bookTitle }).first()
  await expect(row).toBeVisible({ timeout: 20_000 })
  const cell = row
    .locator('td', {
      hasText: /قيد الانتظار|مقبول|تم الأخذ|تم الإرجاع|مرفوض/,
    })
    .first()
  return (await cell.textContent())?.trim() ?? ''
}

/** Opens the loan's edit view from the row's book-cell link. */
async function openLoanEdit(adminPage: Page, bookTitle: string): Promise<void> {
  // The edit view needs a hydration beat before its select reacts.
  await adminPage.waitForTimeout(2_000)
  await clickUntilNavigated(
    adminPage,
    () =>
      adminPage
        .locator('tr', { hasText: bookTitle })
        .first()
        .getByRole('link')
        .first()
        .click({ timeout: 5_000 }),
    /\/admin\/collections\/loans\/\d+/,
  )
}

/** Switches the loan's Status select and saves in the Payload admin edit view. */
async function setAdminStatus(adminPage: Page, label: string): Promise<void> {
  const statusField = adminPage.locator('.field-type.select').first()
  // Verify the select actually shows the new value before saving; a click can
  // be swallowed while the edit view hydrates.
  await expect(async () => {
    await statusField.locator('.rs__control').click()
    await adminPage.locator('.rs__option').filter({ hasText: label }).first().click()
    await expect(statusField.locator('.rs__single-value')).toHaveText(label, {
      timeout: 5_000,
    })
  }).toPass({ timeout: 30_000 })
  await adminPage.getByRole('button', { name: /^Save/ }).click()
  // The save must actually land: 'Submission Successful.' on success, an
  // error toast otherwise (which the test-level retry then re-drives).
  await expect(adminPage.getByText(/uccessful|تم الحفظ/).first()).toBeVisible({
    timeout: 20_000,
  })
}
