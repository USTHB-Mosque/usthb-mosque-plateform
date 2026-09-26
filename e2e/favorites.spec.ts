import { expect, test, type Page } from '@playwright/test'

import { userStorageState } from './lib/auth-state'
import { clickUntilNavigated } from './lib/ui'

test.use({ storageState: userStorageState })

test.beforeEach(() => {
  test.setTimeout(120_000)
})

async function openMemberBook(page: Page, title: string): Promise<void> {
  await page.goto('/user/library')
  // The default grid card nests its title button under an overlay; the table
  // view exposes plain clickable title cells. A click can be swallowed before
  // hydration, so retry the whole switch-then-open chain.
  await expect(async () => {
    await page.getByRole('button', { name: 'عرض جدول' }).click({ timeout: 5_000 })
    await page.getByRole('button', { name: title }).click({ timeout: 5_000 })
    await expect(page).toHaveURL(/\/user\/library\/book\/\d+/, { timeout: 10_000 })
  }).toPass({ timeout: 90_000 })
}

test.describe('favorites', () => {
  test('member saves a book from its detail page and finds it under bookmarks', async ({
    page,
  }) => {
    await openMemberBook(page, 'صحيح البخاري')

    if (await page.getByRole('button', { name: 'إزالة من المفضلة' }).isVisible()) {
      // A retry after the first attempt already saved the book.
      await expect(page.getByRole('button', { name: 'إزالة من المفضلة' })).toBeVisible()
    } else {
      await page.getByRole('button', { name: 'إضافة إلى المفضلة' }).click()
      await expect(page.getByText('أُضيف إلى المفضلة')).toBeVisible({ timeout: 30_000 })
      await expect(page.getByRole('button', { name: 'إزالة من المفضلة' })).toBeVisible()
    }

    await page.goto('/user/bookmarks')
    await expect(page.getByText('صحيح البخاري').first()).toBeVisible({ timeout: 20_000 })
  })

  test('member removes a seeded article favorite from the bookmarks grid', async ({ page }) => {
    await page.goto('/user/bookmarks')

    // The articles tab holds the seeded favorite (see utils/seed/e2e-fixtures.ts).
    await page.getByRole('tab', { name: 'المقالات' }).click()
    // The card wrapper holds the link and the hover-revealed remove button.
    const wrapper = page.locator('div.relative.group', {
      hasText: 'فضائل المسجد وأثره في حياة الطالب',
    })
    await wrapper.hover()
    await wrapper.locator('button').last().click({ timeout: 30_000 })
    await expect(page.getByText('تمت الإزالة من المفضلة')).toBeVisible({ timeout: 30_000 })
  })
})
