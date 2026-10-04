import { expect, test, type Page } from '@playwright/test'

import { userStorageState } from './lib/auth-state'
import { clickUntilNavigated } from './lib/ui'

test.use({ storageState: userStorageState })

// The public listing paginates 3 cards at a time; search narrows to the target
// card so the journey never depends on its position in the seed order.
async function openActivityBySearch(page: Page, title: string): Promise<void> {
  await page.goto('/activities')
  await page.getByPlaceholder('اسم النشاط ...').fill(title)
  // The card itself exposes role="link" (aria-labelledby = its title).
  await clickUntilNavigated(
    page,
    () => page.getByRole('link', { name: title }).first().click({ timeout: 5_000 }),
    /\/activities\/\d+/,
  )
}

test.describe('activity registration', () => {
  test.beforeEach(() => {
    test.setTimeout(120_000)
  })
  test('member registers for an open activity and sees it under my-registrations', async ({
    page,
  }) => {
    await openActivityBySearch(page, 'حلقات تحفيظ القرآن الكريم')
    const activityId = page.url().match(/\/activities\/(\d+)/)?.[1]

    if (await page.getByText('أنت مسجّل في هذا النشاط').isVisible()) {
      // A retry after the first attempt already registered the member.
      await page.goto('/user/my-registrations')
      await expect(
        page.locator('tr', { hasText: 'حلقات تحفيظ القرآن الكريم' }).first(),
      ).toBeVisible()
    } else {
      await page.getByRole('button', { name: 'سجل الآن' }).click()
      await expect(page.getByText('تم التسجيل في النشاط بنجاح')).toBeVisible({ timeout: 30_000 })

      // Success redirects to the member's registrations table (desktop table).
      await expect(page).toHaveURL(/\/user\/my-registrations/, { timeout: 30_000 })
      await expect(
        page.locator('tr', { hasText: 'حلقات تحفيظ القرآن الكريم' }).first(),
      ).toBeVisible({ timeout: 20_000 })
    }

    // The member-portal detail page reflects the registration state.
    await page.goto(`/user/activities/${activityId}`)
    await expect(page.getByText('أنت مسجّل في هذا النشاط')).toBeVisible()
  })

  test('a capacity-full activity refuses registration with an Arabic toast', async ({ page }) => {
    await openActivityBySearch(page, 'نشاط e2e ممتلئ')

    // Registration is still open, so the CTA is enabled — the server gate
    // rejects it because currentParticipants already equals maxParticipants.
    await page.getByRole('button', { name: 'سجل الآن' }).click()
    await expect(page.getByText('عذراً، اكتمل الحد الأقصى للمشاركين')).toBeVisible({
      timeout: 30_000,
    })
    await expect(page).toHaveURL(/\/activities\/\d+/)
  })
})
