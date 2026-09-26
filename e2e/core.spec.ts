import { expect, test } from '@playwright/test'

// The WebKit smoke subset (see playwright.config.ts) — keep this file to the
// core user paths that must render correctly in every engine, RTL included.
test.describe('public browsing', () => {
  test('landing renders RTL Arabic with seeded books', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
    await expect(page.getByText('أحدث إصدارات المكتبة')).toBeVisible()
    // Listings sort by -createdAt: the newest seeded book is always on page 1.
    await expect(page.getByText('آداب الدعوة إلى الله تعالى').first()).toBeVisible({
      timeout: 20_000,
    })
  })

  test('library lists seeded books for guests', async ({ page }) => {
    await page.goto('/library')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
    await expect(page.getByRole('heading', { name: 'مكتبة المسجد' })).toBeVisible()
    await expect(page.getByText('آداب الدعوة إلى الله تعالى').first()).toBeVisible({
      timeout: 20_000,
    })
  })

  test('activities page lists seeded activities', async ({ page }) => {
    await page.goto('/activities')
    // Newest seeded activity = first listing item under the -createdAt sort.
    await expect(page.getByText('دورة في إقامة الصلاة والخطابة').first()).toBeVisible({
      timeout: 20_000,
    })
  })

  test('articles page lists seeded articles', async ({ page }) => {
    await page.goto('/articles')
    await expect(page.getByText('فضائل المسجد وأثره في حياة الطالب').first()).toBeVisible({
      timeout: 20_000,
    })
  })
})
