import { expect, test } from '@playwright/test'

import { userStorageState } from './lib/auth-state'

test.use({ storageState: userStorageState })

test.describe('member portal', () => {
  test('dashboard renders stats for the authenticated member', async ({ page }) => {
    await page.goto('/user/dashboard')
    await expect(page.getByRole('heading', { name: 'لوحة التحكم' })).toBeVisible()
    // The labels also appear in the sidebar, so scope loosely and relax strict mode.
    await expect(page.getByText('إعاراتي').first()).toBeVisible()
    await expect(page.getByText('تسجيلاتي').first()).toBeVisible()
    await expect(page.getByText('مفضّلتي').first()).toBeVisible()
    await expect(page.getByText('المقالات').first()).toBeVisible()
  })

  test('settings page loads for the authenticated member', async ({ page }) => {
    await page.goto('/user/settings')
    await expect(page.getByText('الإعدادات').first()).toBeVisible()
  })
})
