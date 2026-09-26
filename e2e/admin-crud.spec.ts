import { expect, test, type Page } from '@playwright/test'

import { adminStorageState } from './lib/auth-state'
import { clickUntilNavigated } from './lib/ui'

test.use({ storageState: adminStorageState })

test.describe.configure({ mode: 'serial' })

const ADMIN_CRUD_MARKER = 'إدارة e2e'
const BOOK_TITLE = `كتاب ${ADMIN_CRUD_MARKER}`
const ARTICLE_TITLE = `مقال ${ADMIN_CRUD_MARKER}`
const ACTIVITY_TITLE = `نشاط ${ADMIN_CRUD_MARKER}`

test.describe('admin journeys', () => {
  test('CRUD a book from the Payload admin', async ({ page }) => {
    test.setTimeout(180_000)

    await page.goto('/admin/collections/books/create')
    await fillByLabel(page, 'Title', BOOK_TITLE)
    await fillByLabel(page, 'Author', 'مؤلف الاختبار')
    await pickSelect(page, 'Type', 'عقيدة')
    await fillByLabel(page, 'Short Description', 'كتاب إنشائي لاختبار رحلة الإدارة.')

    await page.getByRole('button', { name: /^Save/ }).click()
    // Save leaves the create view (to the document or the list).
    await expect(page).not.toHaveURL(/create/, { timeout: 30_000 })

    // Read: the new book is in the list; open its edit view.
    await openDocFromList(page, '/admin/collections/books', BOOK_TITLE, /\/books\/\d+/)

    // Update: rename it and save.
    await fillByLabel(page, 'Title', `${BOOK_TITLE} معدّل`)
    await page.getByRole('button', { name: /^Save/ }).click()
    await expect(page.getByText(/uccessful|تم الحفظ/).first()).toBeVisible({
      timeout: 30_000,
    })

    // Delete through the list view's bulk actions.
    await deleteFromList(page, '/admin/collections/books', `${BOOK_TITLE} معدّل`)
  })

  test('CRUD an article from the Payload admin', async ({ page }) => {
    test.setTimeout(180_000)

    await page.goto('/admin/collections/articles/create')
    await fillByLabel(page, 'Title', ARTICLE_TITLE)
    await pickSelect(page, 'Type', 'عقيدة')
    await fillByLabel(page, 'Author', 'كاتب الاختبار')
    await fillByLabel(page, 'Short Summary', 'موجز اختبار لمقال منشور إدارياً.')
    await pickUpload(page, 'Image')

    await page.getByRole('button', { name: /^Save/ }).click()
    await expect(page).not.toHaveURL(/create/, { timeout: 30_000 })

    // Read: the new article is in the list; open its edit view.
    await openDocFromList(page, '/admin/collections/articles', ARTICLE_TITLE, /\/articles\/\d+/)

    // Update: rename it and save.
    await fillByLabel(page, 'Title', `${ARTICLE_TITLE} معدّل`)
    await page.getByRole('button', { name: /^Save/ }).click()
    await expect(page.getByText(/uccessful|تم الحفظ/).first()).toBeVisible({
      timeout: 30_000,
    })

    await deleteFromList(page, '/admin/collections/articles', `${ARTICLE_TITLE} معدّل`)
  })

  test('CRUD an activity from the Payload admin', async ({ page }) => {
    test.setTimeout(180_000)

    await page.goto('/admin/collections/activities/create')
    await fillByLabel(page, 'Title', ACTIVITY_TITLE)
    await pickSelect(page, 'Type', 'عقيدة')
    await pickUpload(page, 'Image')
    await fillByLabel(page, 'Short Description', 'نشاط اختبار لرحلة الإدارة.')

    // The long description is a Lexical editor; type a plain paragraph.
    const editor = page.locator('.field-type.rich-text-lexical [contenteditable="true"]').first()
    await editor.click()
    await editor.pressSequentially('وصف إلكتروني لاختبار إنشاء الأنشطة إدارياً.')

    await addArrayRow(page, 'Add Benefit', 'فائدة اختبار', 'Benefits')
    await addArrayRow(page, 'Add Target Audience', 'جمهور اختبار', 'Target Audience')
    await addArrayRow(page, 'Add Schedule', null, 'Activity Schedule')
    await pickDate(page, 'Start Date')

    // The schedule row carries its own required datetime.
    const scheduleField = page
      .locator('.field-type.array-field')
      .filter({ hasText: 'Activity Schedule' })
      .first()
    await pickDateForInput(page, scheduleField.locator('input').first())

    await page.getByRole('button', { name: /^Save/ }).click()
    await expect(page).not.toHaveURL(/create/, { timeout: 30_000 })

    await openDocFromList(
      page,
      '/admin/collections/activities',
      ACTIVITY_TITLE,
      /\/activities\/\d+/,
    )
    await deleteFromList(page, '/admin/collections/activities', ACTIVITY_TITLE)
  })

  test('admin verifies a pending user from the users list', async ({ page }) => {
    test.setTimeout(120_000)

    await page.goto('/admin/collections/users')

    // The lean seed registers member2@e2e.mosque as pending_verification.
    await openDocFromList(page, '/admin/collections/users', 'member2@e2e.mosque', /\/users\/\d+/)

    await pickSelect(page, 'Verification Status', 'Verified')
    await page.getByRole('button', { name: /^Save/ }).click()
    await expect(page.getByText(/uccessful|تم الحفظ/).first()).toBeVisible({
      timeout: 30_000,
    })

    await page.goto('/admin/collections/users')
    await expect(
      page.locator('tr', { hasText: 'member2@e2e.mosque' }).first().getByText('Verified'),
    ).toBeVisible({ timeout: 20_000 })
  })

  test('admin sees the seeded loans in the loans table', async ({ page }) => {
    test.setTimeout(90_000)

    await page.goto('/admin/collections/loans')

    // Seeded lifecycle states (utils/seed/e2e-fixtures.ts) render as rows.
    await expect(page.locator('tr', { hasText: 'صحيح البخاري' }).first()).toBeVisible({
      timeout: 20_000,
    })
    await expect(
      page.locator('tr', { hasText: 'زاد المعاد في هدي خير العباد' }).first(),
    ).toBeVisible()
  })
})

async function fillByLabel(page: Page, label: string, value: string): Promise<void> {
  await page.getByLabel(label).first().fill(value)
}

/** Opens the named react-select field and picks an option by visible label. */
async function pickSelect(page: Page, fieldLabel: string, optionLabel: string): Promise<void> {
  const field = page
    .locator('.field-type.select')
    .filter({ has: page.locator('label', { hasText: fieldLabel }) })
    .first()
  // Verify the select actually shows the new value; a click can be swallowed
  // while the form hydrates.
  await expect(async () => {
    await field.locator('.rs__control').click()
    await page.locator('.rs__option').filter({ hasText: optionLabel }).first().click()
    // Payload renders the raw select value; compare case-insensitively.
    await expect(field.locator('.rs__single-value')).toHaveText(optionLabel, {
      timeout: 5_000,
      ignoreCase: true,
    })
  }).toPass({ timeout: 30_000 })
}

/** Uploads a fresh media document inside the named upload field's drawer. */
async function pickUpload(page: Page, fieldLabel: string): Promise<void> {
  const field = page
    .locator('.field-type.upload')
    .filter({ has: page.locator('label', { hasText: fieldLabel }) })
    .first()
  await field.getByRole('button', { name: 'Create New' }).click()
  const drawer = page.getByRole('dialog').last()
  await drawer.locator('input[type="file"]').setInputFiles('public/static/images/ramadan.png')
  await drawer.getByRole('button', { name: /^Save/ }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 20_000 })
}

/** Adds one row to the named array field and fills its name input. */
async function addArrayRow(
  page: Page,
  addButtonLabel: string,
  value: string | null,
  fieldText: string,
): Promise<void> {
  if (value) {
    const field = page.locator('.field-type.array-field').filter({ hasText: fieldText }).first()
    const input = field.locator('input[type="text"]').first()
    // React may drop the click while the Lexical editor re-renders; retry
    // until the row's input actually exists.
    await expect(async () => {
      await page.getByRole('button', { name: addButtonLabel }).click()
      await expect(input).toBeVisible({ timeout: 3_000 })
    }).toPass({ timeout: 30_000 })
    await input.fill(value)
  } else {
    await page.getByRole('button', { name: addButtonLabel }).click()
    await expect(
      page
        .locator('.field-type.array-field')
        .filter({ hasText: fieldText })
        .first()
        .locator('input[type="text"]'),
    ).toBeVisible({ timeout: 10_000 })
  }
}

/** Opens the named date field and picks an enabled day and the first time slot. */
async function pickDate(page: Page, fieldLabel: string): Promise<void> {
  const field = page
    .locator('.field-type.date-time-field')
    .filter({ has: page.locator('label', { hasText: fieldLabel }) })
    .first()
  await pickDateForInput(page, field.locator('input').first())
}

/**
 * Drives the react-datepicker for the given input until it actually carries a
 * picked value; under load the popover or a click can race a re-render.
 */
async function pickDateForInput(page: Page, input: ReturnType<Page['locator']>): Promise<void> {
  await expect(async () => {
    await input.click()
    await pickDateFromPopover(page)
    await expect(input).not.toHaveValue('', { timeout: 5_000 })
  }).toPass({ timeout: 60_000 })
}

/** Drives the react-datepicker popover currently open for the last focused input. */
async function pickDateFromPopover(page: Page): Promise<void> {
  await page
    .locator(
      '.react-datepicker__day:not(.react-datepicker__day--disabled):not(.react-datepicker__day--outside-month)',
    )
    .first()
    .click()
  await page.locator('.react-datepicker__time-list-item').first().click()
}

/** Opens a collection's list view and navigates into the named document. */
async function openDocFromList(
  page: Page,
  listPath: string,
  rowTitle: string,
  urlPattern: RegExp,
): Promise<void> {
  await page.goto(listPath)
  // Clicking a row before the admin app finishes hydrating silently swallows
  // the client-router push; the retry below tolerates that race.
  await page.waitForTimeout(2_000)
  await clickUntilNavigated(
    page,
    () =>
      page
        .locator('tr', { hasText: rowTitle })
        .first()
        .getByRole('link')
        .first()
        .click({ timeout: 5_000 }),
    urlPattern,
  )
}

/**
 * Deletes the named document from a list view: select its row checkbox, run
 * the bulk delete action, and confirm the modal.
 */
async function deleteFromList(page: Page, listPath: string, rowTitle: string): Promise<void> {
  await page.goto(listPath)
  const row = page.locator('tr', { hasText: rowTitle }).first()
  await expect(row).toBeVisible({ timeout: 20_000 })
  await row.getByRole('checkbox').click()
  await page.getByRole('button', { name: 'Delete' }).first().click()
  await page.getByRole('button', { name: 'Confirm' }).click()
  await expect(page.locator('tr', { hasText: rowTitle })).toHaveCount(0, { timeout: 20_000 })
}
